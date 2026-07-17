'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Package,
  ImageOff,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Flag,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { ShopShell, primaryBtnClass, secondaryBtnClass } from '@/components/shop-shell';
import { getAccessToken, shopPartnerApi, type ShopOrder } from '@/lib/api';
import { formatDate, formatInr } from '@/lib/format';

type ReturnKind = 'pending' | 'pickup' | 'disputed' | 'completed';

type ReturnRequest = {
  id: string;
  kind: ReturnKind;
  order: ShopOrder;
  label: string;
  reason: string;
};

const REFUND_FEE = 50;

function amount(order: ShopOrder) {
  return Number(order.totalAmount) || 0;
}

function primaryItem(order: ShopOrder) {
  return order.items?.[0];
}

function customerName(order: ShopOrder) {
  if (order.user) {
    const name = `${order.user.firstName} ${order.user.lastName}`.trim();
    if (name) return name;
  }
  return order.shippingName || 'Customer';
}

function classifyOrder(order: ShopOrder): ReturnKind | null {
  if (order.paymentStatus === 'REFUNDED') return 'completed';
  if (order.paymentStatus === 'PARTIALLY_REFUNDED') return 'disputed';
  if (order.status === 'RETURNED' && order.paymentStatus === 'PAID') return 'pickup';
  if (order.status === 'RETURNED') return 'completed';
  if (order.status === 'CANCELLED' && order.paymentStatus === 'PAID') return 'pending';
  return null;
}

function kindLabel(kind: ReturnKind) {
  switch (kind) {
    case 'pending':
      return 'PENDING REVIEW';
    case 'pickup':
      return 'PICKUP ASSIGNED';
    case 'disputed':
      return 'DISPUTED';
    case 'completed':
      return 'COMPLETED';
  }
}

function kindBadgeClass(kind: ReturnKind) {
  switch (kind) {
    case 'pending':
      return 'bg-[#ffdbcc] text-[#351000]';
    case 'pickup':
      return 'bg-[#dae2fd] text-[#131b2e]';
    case 'disputed':
      return 'bg-[#ffdad6] text-[#93000a]';
    case 'completed':
      return 'bg-green-100 text-green-800';
  }
}

function defaultReason(order: ShopOrder, kind: ReturnKind) {
  if (kind === 'completed') {
    return 'Return completed. Refund or inventory RETURN movement was recorded against this order.';
  }
  if (kind === 'disputed') {
    return 'Partial refund detected. Customer and seller may still disagree on remaining amount.';
  }
  if (kind === 'pending') {
    return `Order ${order.orderNumber} was cancelled after payment. Awaiting seller confirmation to finalize refund handling.`;
  }
  return `Order ${order.orderNumber} is marked RETURNED while payment remains PAID. Arrange pickup / QC before finance issues a refund. No customer evidence text is stored by the API yet.`;
}

function toRequest(order: ShopOrder): ReturnRequest | null {
  const kind = classifyOrder(order);
  if (!kind) return null;
  return {
    id: `RT-${order.orderNumber.replace(/[^a-zA-Z0-9]/g, '').slice(-6) || order.id.slice(0, 6)}`,
    kind,
    order,
    label: kindLabel(kind),
    reason: defaultReason(order, kind),
  };
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

export default function ReturnsPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | ReturnKind>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    shopPartnerApi
      .listOrders(token)
      .then((list) => {
        setOrders(list);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load returns'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requests = useMemo(() => {
    return orders
      .map(toRequest)
      .filter((r): r is ReturnRequest => Boolean(r))
      .sort(
        (a, b) =>
          +new Date(b.order.updatedAt ?? b.order.createdAt) -
          +new Date(a.order.updatedAt ?? a.order.createdAt),
      );
  }, [orders]);

  useEffect(() => {
    if (!selectedId && requests[0]) setSelectedId(requests[0].id);
    if (selectedId && !requests.some((r) => r.id === selectedId)) {
      setSelectedId(requests[0]?.id ?? null);
    }
  }, [requests, selectedId]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filter !== 'all' && r.kind !== filter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const item = primaryItem(r.order);
      const hay =
        `${r.id} ${r.order.orderNumber} ${item?.productName ?? ''} ${customerName(r.order)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [requests, filter, search]);

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  const kpis = useMemo(() => {
    const pending = requests.filter((r) => r.kind === 'pending').length;
    const pickup = requests.filter((r) => r.kind === 'pickup').length;
    const disputed = requests.filter((r) => r.kind === 'disputed').length;
    const completed = requests.filter((r) => r.kind === 'completed').length;
    return { pending, pickup, disputed, completed };
  }, [requests]);

  async function markReturned() {
    if (!selected) return;
    const token = getAccessToken();
    if (!token) return;
    if (selected.order.status === 'RETURNED') {
      setNotice(
        'Order is already RETURNED. Payment refund cannot be triggered from this portal yet.',
      );
      return;
    }
    if (
      !['DELIVERED', 'SHIPPED', 'CANCELLED', 'PROCESSING', 'CONFIRMED'].includes(
        selected.order.status,
      )
    ) {
      setNotice(`Cannot mark ${selected.order.status} as RETURNED via available status API.`);
      return;
    }
    setActing(true);
    setError('');
    setNotice('');
    try {
      await shopPartnerApi.updateOrderStatus(token, selected.order.id, { status: 'RETURNED' });
      setNotice(
        `Order ${selected.order.orderNumber} marked RETURNED. This does not move money — refund APIs are not available.`,
      );
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order status');
    } finally {
      setActing(false);
    }
  }

  async function rejectReturn() {
    if (!selected) return;
    const token = getAccessToken();
    if (!token) return;
    // Reject = restore to DELIVERED when currently RETURNED/CANCELLED path is pending review
    if (selected.order.status !== 'CANCELLED' && selected.order.status !== 'RETURNED') {
      setNotice('Reject only applies when the order is CANCELLED or RETURNED.');
      return;
    }
    setActing(true);
    setError('');
    setNotice('');
    try {
      await shopPartnerApi.updateOrderStatus(token, selected.order.id, { status: 'DELIVERED' });
      setNotice(`Order ${selected.order.orderNumber} restored to DELIVERED. No refund was issued.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order status');
    } finally {
      setActing(false);
    }
  }

  function exportCsv() {
    downloadCsv('returns.csv', [
      ['Request ID', 'Order', 'Status', 'Customer', 'Amount', 'Date'],
      ...filtered.map((r) => [
        r.id,
        r.order.orderNumber,
        r.label,
        customerName(r.order),
        String(amount(r.order)),
        r.order.createdAt,
      ]),
    ]);
  }

  const itemTotal = selected ? amount(selected.order) : 0;
  const refundTotal = Math.max(0, itemTotal - REFUND_FEE);

  return (
    <ShopShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Returns & Refunds</h1>
          <p className="mt-1 text-sm text-muted">
            Ops queue derived from order status and payment state. There is no dedicated returns API
            — approve actions only update order status when valid.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-full border border-border bg-surface-low py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
            placeholder="Search Request ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-xl border border-border bg-surface-low px-4 py-3 text-sm text-muted">
          {notice}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pending Approval"
          value={kpis.pending}
          accent="text-primary"
          onClick={() => setFilter('pending')}
          active={filter === 'pending'}
        />
        <KpiCard
          label="Active Pickups"
          value={kpis.pickup}
          hint="RETURNED · unpaid refund"
          onClick={() => setFilter('pickup')}
          active={filter === 'pickup'}
        />
        <KpiCard
          label="Open Disputes"
          value={kpis.disputed}
          accent="text-error"
          urgent={kpis.disputed > 0}
          onClick={() => setFilter('disputed')}
          active={filter === 'disputed'}
        />
        <KpiCard
          label="Completed"
          value={kpis.completed}
          hint="Returned / refunded"
          onClick={() => setFilter('completed')}
          active={filter === 'completed'}
        />
      </div>

      {filter !== 'all' && (
        <button
          type="button"
          className="mb-4 text-xs font-bold text-primary hover:underline"
          onClick={() => setFilter('all')}
        >
          Clear filter · show all
        </button>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-low px-4 py-3">
              <h2 className="text-sm font-bold">Recent Return Requests</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={secondaryBtnClass}
                  onClick={() => setFilter('all')}
                >
                  Filter
                </button>
                <button type="button" className={secondaryBtnClass} onClick={exportCsv}>
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-[11px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted">
                        Loading return queue…
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted">
                        No return candidates yet. Paid cancellations, returned orders, and refunded
                        payments will appear in this queue.
                      </td>
                    </tr>
                  )}
                  {filtered.map((req) => {
                    const item = primaryItem(req.order);
                    const active = selected?.id === req.id;
                    return (
                      <tr
                        key={req.id}
                        className={`cursor-pointer border-b border-border/60 transition last:border-0 ${
                          active
                            ? 'border-l-4 border-l-primary bg-surface-low'
                            : 'hover:bg-surface-low/70'
                        }`}
                        onClick={() => setSelectedId(req.id)}
                      >
                        <td className="px-4 py-4 font-bold text-primary">#{req.id}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-high">
                              <Package className="h-4 w-4 text-muted" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">
                                {item?.productName ?? 'Order items'}
                              </p>
                              <p className="text-xs text-muted">
                                {item?.variantName ??
                                  `${req.order.items?.length ?? 0} item(s) · ${req.order.orderNumber}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs">{formatDate(req.order.createdAt)}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded px-2 py-1 text-[10px] font-bold ${kindBadgeClass(req.kind)}`}
                          >
                            {req.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-bold">{formatInr(amount(req.order))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          {selected ? (
            <>
              <div className="space-y-4 rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-bold">Request Detail</h3>
                    <p className="text-sm font-bold text-primary">#{selected.id}</p>
                    <p className="mt-1 text-xs text-muted">
                      {customerName(selected.order)}
                      {selected.order.user?.email ? ` · ${selected.order.user.email}` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-[10px] font-bold ${kindBadgeClass(selected.kind)}`}
                  >
                    {selected.label}
                  </span>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase text-muted">Return Reason</p>
                  <div className="mt-2 rounded-xl border border-border bg-surface-low p-3">
                    <p className="text-sm italic text-foreground/90">
                      &ldquo;{selected.reason}&rdquo;
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase text-muted">Evidence</p>
                  <div className="mt-2 flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-low text-muted"
                      >
                        <ImageOff className="h-5 w-5" />
                        <span className="mt-1 text-[9px]">No photo</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Customer evidence is not stored by the backend yet.
                  </p>
                </div>

                <div className="space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Item Total</span>
                    <span className="font-bold">{formatInr(itemTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Estimated Refund Fees</span>
                    <span className="font-bold text-error">-{formatInr(REFUND_FEE)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-border pt-2 font-display text-lg">
                    <span className="font-bold">Total Refund</span>
                    <span className="font-bold text-primary">{formatInr(refundTotal)}</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Refund calculation is illustrative — payment capture/refund APIs are not wired
                    here.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    disabled={
                      acting ||
                      selected.order.status === 'RETURNED' ||
                      selected.kind === 'completed'
                    }
                    className={`${primaryBtnClass} rounded-xl !px-3`}
                    onClick={markReturned}
                    title="Sets order status to RETURNED"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={
                      acting ||
                      (selected.order.status !== 'CANCELLED' &&
                        selected.order.status !== 'RETURNED')
                    }
                    className={`${secondaryBtnClass} rounded-xl !px-3 bg-surface-high`}
                    onClick={rejectReturn}
                    title="Restores CANCELLED/RETURNED to DELIVERED"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled
                    className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#565e74] px-4 py-2.5 text-sm font-bold text-white opacity-60"
                    title="Replacement fulfillment API not available"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Send Replacement
                  </button>
                </div>
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-center gap-1 rounded-xl border border-error/20 py-2 text-sm font-bold text-error opacity-60"
                  title="Dispute center not available"
                >
                  <Flag className="h-4 w-4" />
                  Escalate to Dispute
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold">
                  <Truck className="h-4 w-4 text-muted" />
                  Pickup Logistics
                </h4>
                <div className="relative space-y-4 pl-6">
                  <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-[#dae2fd]" />
                  <LogisticsStep
                    active
                    title="Customer address"
                    detail={`${selected.order.shippingAddress ?? '—'}, ${selected.order.shippingCity ?? ''} ${selected.order.shippingPincode ?? ''}`.trim()}
                    sub={selected.order.shippingPhone ?? 'No phone on file'}
                  />
                  <LogisticsStep
                    active={selected.kind === 'pickup' || selected.kind === 'completed'}
                    title={
                      selected.order.trackingNumber ? 'Tracking on file' : 'Awaiting collection'
                    }
                    detail={
                      selected.order.trackingNumber
                        ? `Tracking: ${selected.order.trackingNumber}`
                        : 'No reverse logistics partner assigned by API'
                    }
                    sub={
                      selected.order.shippedAt
                        ? `Shipped ${formatDate(selected.order.shippedAt)}`
                        : 'Schedule TBD'
                    }
                  />
                  <LogisticsStep
                    active={selected.kind === 'completed'}
                    title="Final QC & Refund"
                    detail={
                      selected.kind === 'completed'
                        ? 'Order marked returned / refunded'
                        : 'Pending warehouse scan'
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-low p-8 text-center text-sm text-muted">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
              Select a return request to review details.
            </div>
          )}
        </aside>
      </div>
    </ShopShell>
  );
}

function KpiCard({
  label,
  value,
  hint,
  accent,
  urgent,
  onClick,
  active,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: string;
  urgent?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border bg-card p-4 text-left shadow-sm transition ${
        urgent ? 'border-l-4 border-l-error' : 'border-border'
      } ${active ? 'ring-2 ring-primary/30' : 'hover:bg-surface-low/50'}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`font-display text-3xl font-bold ${accent ?? ''}`}>
          {String(value).padStart(2, '0')}
        </span>
        {urgent && value > 0 && (
          <span className="rounded-full bg-[#ffdad6] px-2 py-0.5 text-[10px] font-bold uppercase text-[#93000a]">
            Urgent
          </span>
        )}
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
    </button>
  );
}

function LogisticsStep({
  active,
  title,
  detail,
  sub,
}: {
  active?: boolean;
  title: string;
  detail: string;
  sub?: string;
}) {
  return (
    <div className={`relative ${active ? '' : 'opacity-50'}`}>
      <div
        className={`absolute -left-[23px] top-1 h-4 w-4 rounded-full border-4 border-white shadow-sm ${
          active ? 'bg-primary' : 'bg-border'
        }`}
      />
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs text-muted">{detail}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
