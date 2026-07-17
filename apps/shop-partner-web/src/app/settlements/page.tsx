'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  Wallet,
  Clock3,
  Building2,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter,
  Search,
} from 'lucide-react';
import { ShopShell, primaryBtnClass } from '@/components/shop-shell';
import { getAccessToken, getAuthSession, shopPartnerApi, type ShopOrder } from '@/lib/api';
import { formatInr } from '@/lib/format';

const COMMISSION_RATE = 0.12;
const RANGE_OPTIONS = [
  { id: '7d', label: 'Last 7 Days', days: 7 },
  { id: '30d', label: 'Last 30 Days', days: 30 },
  { id: '90d', label: 'Last 90 Days', days: 90 },
] as const;

type RangeId = (typeof RANGE_OPTIONS)[number]['id'];

type SettlementBatch = {
  id: string;
  start: Date;
  end: Date;
  orders: ShopOrder[];
  net: number;
  status: 'Settled' | 'Pending' | 'Held';
};

function amount(order: ShopOrder) {
  return Number(order.totalAmount) || 0;
}

function shippingOf(order: ShopOrder) {
  return Number(order.shippingAmount ?? 0) || 0;
}

function subtotalOf(order: ShopOrder) {
  return Number(order.subtotalAmount ?? order.totalAmount) || 0;
}

function isPaid(order: ShopOrder) {
  return order.paymentStatus === 'PAID';
}

function isRefunded(order: ShopOrder) {
  return (
    order.paymentStatus === 'REFUNDED' ||
    order.paymentStatus === 'PARTIALLY_REFUNDED' ||
    order.status === 'RETURNED' ||
    order.status === 'CANCELLED'
  );
}

function isPendingClearance(order: ShopOrder) {
  return isPaid(order) && ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status);
}

function isAvailable(order: ShopOrder) {
  return isPaid(order) && order.status === 'DELIVERED';
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function endOfWeek(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function estimateNet(orders: ShopOrder[]) {
  const gross = orders.reduce((s, o) => s + subtotalOf(o), 0);
  const refunds = orders.filter(isRefunded).reduce((s, o) => s + amount(o), 0);
  const shipping = orders.reduce((s, o) => s + shippingOf(o), 0);
  const commission = Math.round(gross * COMMISSION_RATE);
  const tax = Math.round(gross * 0.05);
  return Math.max(0, gross - refunds - commission - shipping + tax);
}

function formatRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettlementsPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [tenantName, setTenantName] = useState('Your shop');
  const [range, setRange] = useState<RangeId>('30d');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      shopPartnerApi.listOrders(token),
      shopPartnerApi.getTenantMe(token).catch(() => null),
    ])
      .then(([orderList, tenant]) => {
        setOrders(orderList);
        if (tenant?.name) setTenantName(tenant.name);
        else {
          const session = getAuthSession();
          if (session?.tenantName) setTenantName(session.tenantName);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settlements'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rangeDays = RANGE_OPTIONS.find((r) => r.id === range)?.days ?? 30;
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [rangeDays]);

  const inRange = useMemo(
    () => orders.filter((o) => new Date(o.createdAt) >= cutoff),
    [orders, cutoff],
  );

  const availableOrders = useMemo(() => inRange.filter(isAvailable), [inRange]);
  const pendingOrders = useMemo(() => inRange.filter(isPendingClearance), [inRange]);
  const refundedOrders = useMemo(() => inRange.filter(isRefunded), [inRange]);

  const availableNet = useMemo(() => estimateNet(availableOrders), [availableOrders]);
  const pendingNet = useMemo(
    () => pendingOrders.reduce((s, o) => s + amount(o), 0),
    [pendingOrders],
  );

  const breakdown = useMemo(() => {
    const pool = [...availableOrders, ...pendingOrders];
    const gross = pool.reduce((s, o) => s + subtotalOf(o), 0);
    const refunds = refundedOrders.reduce((s, o) => s + amount(o), 0);
    const shipping = pool.reduce((s, o) => s + shippingOf(o), 0);
    const commission = Math.round(gross * COMMISSION_RATE);
    const tax = Math.round(gross * 0.05);
    const net = Math.max(0, gross - refunds - commission - shipping + tax);
    return { gross, refunds, shipping, commission, tax, net };
  }, [availableOrders, pendingOrders, refundedOrders]);

  const batches = useMemo(() => {
    const map = new Map<string, SettlementBatch>();
    const settledPool = orders.filter((o) => isPaid(o) || isRefunded(o));
    for (const order of settledPool) {
      const start = startOfWeek(new Date(order.createdAt));
      const key = start.toISOString().slice(0, 10);
      let batch = map.get(key);
      if (!batch) {
        batch = {
          id: `SET-${key.replace(/-/g, '').slice(2)}`,
          start,
          end: endOfWeek(start),
          orders: [],
          net: 0,
          status: 'Pending',
        };
        map.set(key, batch);
      }
      batch.orders.push(order);
    }

    const result = Array.from(map.values())
      .map((batch) => {
        const allDelivered = batch.orders.every((o) => o.status === 'DELIVERED' || isRefunded(o));
        const hasHeld = batch.orders.some(
          (o) => o.status === 'RETURNED' || o.paymentStatus === 'PARTIALLY_REFUNDED',
        );
        const status: SettlementBatch['status'] = hasHeld
          ? 'Held'
          : allDelivered
            ? 'Settled'
            : 'Pending';
        return { ...batch, net: estimateNet(batch.orders), status };
      })
      .sort((a, b) => b.start.getTime() - a.start.getTime());

    return result;
  }, [orders]);

  const filteredBatches = useMemo(() => {
    if (!search.trim()) return batches;
    const q = search.trim().toLowerCase();
    return batches.filter(
      (b) =>
        b.id.toLowerCase().includes(q) ||
        b.orders.some((o) => o.orderNumber.toLowerCase().includes(q)),
    );
  }, [batches, search]);

  const weeklyVelocity = useMemo(() => {
    return batches
      .slice(0, 7)
      .reverse()
      .map((b) => b.net);
  }, [batches]);

  const maxVelocity = Math.max(1, ...weeklyVelocity);
  const heldCount = batches.filter((b) => b.status === 'Held').length;
  const heldBatch = batches.find((b) => b.status === 'Held');

  const nextSettlement = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilTue = (2 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilTue);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  function exportStatements() {
    downloadCsv(`settlements-${range}.csv`, [
      ['Settlement ID', 'Date Range', 'Status', 'Orders', 'Net Amount (est.)'],
      ...filteredBatches.map((b) => [
        b.id,
        formatRange(b.start, b.end),
        b.status,
        String(b.orders.length),
        String(b.net),
      ]),
    ]);
  }

  return (
    <ShopShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Settlements</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your earnings, taxes, and bank transfers. Figures are estimates derived from
            order totals — a dedicated settlement ledger is not yet available.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <select
              className="appearance-none rounded-xl border border-border bg-white py-2.5 pl-9 pr-8 text-sm font-semibold"
              value={range}
              onChange={(e) => setRange(e.target.value as RangeId)}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={primaryBtnClass} onClick={exportStatements}>
            <Download className="h-4 w-4" />
            Export Statements
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading settlement estimates…</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-12">
            <article className="relative overflow-hidden rounded-2xl bg-primary-container p-6 text-[#572000] shadow-sm lg:col-span-5">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                Available for Settlement
              </p>
              <p className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                {formatInr(availableNet)}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#572000]/20 bg-[#572000]/10 px-3 py-1 text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Next settlement: {nextSettlement}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled
                  title="Payout API not available yet"
                  className="flex-1 rounded-xl bg-white py-3 text-sm font-bold text-primary opacity-70"
                >
                  Request Early Payout
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-[#572000]/20 p-3"
                  aria-label="Wallet info"
                >
                  <Wallet className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-[11px] opacity-80">
                Est. from {availableOrders.length} delivered + paid orders in range
              </p>
            </article>

            <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-3">
              <div>
                <div className="flex items-start justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    Pending Processing
                  </p>
                  <Clock3 className="h-5 w-5 text-muted" />
                </div>
                <p className="mt-2 font-display text-3xl font-bold">{formatInr(pendingNet)}</p>
                <p className="mt-1 text-xs text-muted">From {pendingOrders.length} recent orders</p>
              </div>
              <div className="mt-4 border-t border-border pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Expected Clearance</span>
                  <span className="font-bold">2–3 Business Days</span>
                </div>
              </div>
            </article>

            <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Primary Settlement Account
                </p>
                <span className="text-xs font-bold text-primary opacity-50">Edit</span>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-low p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{tenantName}</p>
                  <p className="text-xs text-muted">Partner payout account · not linked yet</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-[#dae2fd]/40 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <p className="text-xs text-muted">
                  Bank details are managed by FitOra finance. Standard payouts are processed every
                  Tuesday once a settlement ledger ships.
                </p>
              </div>
            </article>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-12">
            <section className="space-y-4 xl:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">Settlement History</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                    <input
                      className="rounded-lg border border-border bg-white py-1.5 pl-8 pr-3 text-xs"
                      placeholder="Search ID / order"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-border p-2"
                    aria-label="Filter"
                  >
                    <Filter className="h-4 w-4 text-muted" />
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface-low text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-3 font-bold">Settlement ID</th>
                      <th className="px-5 py-3 font-bold">Date Range</th>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 text-right font-bold">Net Amount</th>
                      <th className="px-5 py-3 text-center font-bold">Invoices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-muted">
                          No settlement periods yet. Paid orders will group into weekly estimates.
                        </td>
                      </tr>
                    )}
                    {filteredBatches.map((batch) => (
                      <tr
                        key={batch.id}
                        className="border-b border-border/60 transition hover:bg-surface-low/80 last:border-0"
                      >
                        <td className="px-5 py-4 font-bold">{batch.id}</td>
                        <td className="px-5 py-4 text-muted">
                          {formatRange(batch.start, batch.end)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill status={batch.status} />
                        </td>
                        <td className="px-5 py-4 text-right font-bold">
                          {formatInr(batch.net)}
                          <span className="ml-1 text-[10px] font-normal text-muted">est.</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <FileText className="h-4 w-4 text-primary" />
                            {batch.orders.length}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="space-y-4 xl:col-span-4">
              <h2 className="font-display text-xl font-semibold">Breakdown</h2>
              <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <BreakdownRow label="Total Gross Sales" value={formatInr(breakdown.gross)} />
                <BreakdownRow
                  label="Refunds Issued"
                  value={`-${formatInr(breakdown.refunds)}`}
                  tone="error"
                />
                <BreakdownRow
                  label={`FitOra Commission (${Math.round(COMMISSION_RATE * 100)}%)`}
                  value={`-${formatInr(breakdown.commission)}`}
                  tone="error"
                  hint="estimate"
                />
                <BreakdownRow
                  label="Shipping Fees"
                  value={`-${formatInr(breakdown.shipping)}`}
                  tone="error"
                />
                <BreakdownRow
                  label="GST / Sales Tax Collected"
                  value={formatInr(breakdown.tax)}
                  hint="5% est."
                />
                <div className="h-px bg-border" />
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-muted">Total Net Settlement</p>
                    <p className="font-display text-2xl font-bold text-primary">
                      {formatInr(breakdown.net)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-muted">Estimate</span>
                </div>
                <div className="relative flex h-24 items-end gap-1 rounded-xl border border-border bg-surface-low p-3">
                  {weeklyVelocity.length === 0 && (
                    <p className="absolute inset-0 flex items-center justify-center text-xs text-muted">
                      No weekly velocity yet
                    </p>
                  )}
                  {weeklyVelocity.map((v, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-primary/20 transition hover:bg-primary"
                      style={{ height: `${Math.max(8, (v / maxVelocity) * 100)}%` }}
                      title={formatInr(v)}
                    />
                  ))}
                  <span className="absolute right-2 top-2 text-[10px] font-bold text-muted">
                    Weekly Velocity
                  </span>
                </div>
              </div>

              {heldCount > 0 && heldBatch ? (
                <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-error/30 bg-red-50/50 p-5">
                  <div className="flex items-center gap-2 text-error">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-bold">
                      {heldCount} Held Settlement{heldCount > 1 ? 's' : ''} Detected
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {heldBatch.id} includes returned or partially refunded orders (e.g.{' '}
                    {heldBatch.orders.find((o) => isRefunded(o))?.orderNumber ?? '—'}). Resolve
                    returns to release estimated funds.
                  </p>
                  <a
                    href="/returns"
                    className="w-fit text-sm font-bold text-primary hover:underline"
                  >
                    Go to Returns
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface-low p-5 text-xs text-muted">
                  No held settlements in the current estimate. Returned or disputed orders will
                  appear here.
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </ShopShell>
  );
}

function StatusPill({ status }: { status: SettlementBatch['status'] }) {
  const styles =
    status === 'Settled'
      ? 'bg-green-100 text-green-700'
      : status === 'Held'
        ? 'bg-surface-high text-muted'
        : 'bg-amber-100 text-amber-800';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}
    >
      {status === 'Settled' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'Held' && <AlertTriangle className="h-3 w-3" />}
      {status === 'Pending' && <Clock3 className="h-3 w-3" />}
      {status}
    </span>
  );
}

function BreakdownRow({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: 'error';
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">
        {label}
        {hint && <span className="ml-1 text-[10px] opacity-70">({hint})</span>}
      </span>
      <span className={`font-bold ${tone === 'error' ? 'text-error' : ''}`}>{value}</span>
    </div>
  );
}
