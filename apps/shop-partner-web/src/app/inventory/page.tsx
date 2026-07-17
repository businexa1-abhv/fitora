'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import { ShopShell, primaryBtnClass, secondaryBtnClass } from '@/components/shop-shell';
import {
  getAccessToken,
  shopPartnerApi,
  type InventoryMovement,
  type ShopProduct,
} from '@/lib/api';
import { formatDate } from '@/lib/format';

const TYPES = ['All Types', 'SALE', 'RESTOCK', 'RETURN', 'ADJUSTMENT'] as const;

export default function InventoryPage() {
  const [lowStock, setLowStock] = useState<ShopProduct[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>('All Types');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustType, setAdjustType] = useState('RESTOCK');
  const [adjustReason, setAdjustReason] = useState('');

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      shopPartnerApi.getLowStock(token),
      shopPartnerApi.listInventoryMovements(token, page),
      shopPartnerApi.listProducts(token),
      shopPartnerApi.getDashboard(token),
    ])
      .then(([stock, moves, catalog, dash]) => {
        setLowStock(stock.products);
        setMovements(moves.items);
        setTotal(moves.total);
        setProducts(catalog);
        if (!adjustProductId && catalog[0]) setAdjustProductId(catalog[0].id);
        void dash;
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load inventory'))
      .finally(() => setLoading(false));
  }, [page, adjustProductId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  const inbound = movements
    .filter((m) => m.quantityChange > 0)
    .reduce((s, m) => s + m.quantityChange, 0);
  const damage = movements
    .filter((m) => m.type === 'ADJUSTMENT' && m.quantityChange < 0)
    .reduce((s, m) => s + Math.abs(m.quantityChange), 0);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (typeFilter !== 'All Types' && m.type !== typeFilter) return false;
      if (!search.trim()) return true;
      const hay =
        `${m.product?.name ?? ''} ${m.product?.sku ?? ''} ${m.variant?.sku ?? ''}`.toLowerCase();
      return hay.includes(search.trim().toLowerCase());
    });
  }, [movements, typeFilter, search]);

  async function submitAdjust() {
    const token = getAccessToken();
    if (!token || !adjustProductId) return;
    const qty = Number(adjustQty);
    if (!qty) return;
    try {
      await shopPartnerApi.adjustInventory(token, {
        productId: adjustProductId,
        quantityChange: qty,
        type: adjustType,
        reason: adjustReason || 'Manual adjustment from ledger',
      });
      setAdjustReason('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adjustment failed');
    }
  }

  return (
    <ShopShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Inventory Movement Ledger</h1>
          <p className="mt-1 text-sm text-muted">
            Real-time tracking of all stock fluctuations across your catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={secondaryBtnClass}>
            <Download className="h-4 w-4" /> Export Ledger
          </button>
          <button type="button" className={primaryBtnClass} onClick={() => void submitAdjust()}>
            <Plus className="h-4 w-4" /> Manual Adjustment
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Stock Units" value={String(totalUnits)} hint="+12%" tone="up" />
        <Kpi
          label="Low Stock Alerts"
          value={String(lowStock.length)}
          hint="Action Required"
          tone="warn"
        />
        <Kpi label="Inbound (page)" value={String(inbound)} hint="Units" />
        <Kpi label="Returns/Damage" value={String(damage)} hint="Loss watch" />
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
        <select
          className="rounded-xl border border-border px-3 py-2 text-sm"
          value={adjustProductId}
          onChange={(e) => setAdjustProductId(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-border px-3 py-2 text-sm"
          value={adjustType}
          onChange={(e) => setAdjustType(e.target.value)}
        >
          <option value="RESTOCK">Purchase / Restock</option>
          <option value="ADJUSTMENT">Adjustment / Damage</option>
          <option value="RETURN">Return</option>
          <option value="SALE">Sale</option>
        </select>
        <input
          className="rounded-xl border border-border px-3 py-2 text-sm"
          value={adjustQty}
          onChange={(e) => setAdjustQty(e.target.value)}
          placeholder="Qty change (+/-)"
        />
        <input
          className="rounded-xl border border-border px-3 py-2 text-sm"
          value={adjustReason}
          onChange={(e) => setAdjustReason(e.target.value)}
          placeholder="Reason / reference"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-xl border border-border px-3 py-2 text-sm"
          placeholder="Search Product"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-xl border border-border px-3 py-2 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as (typeof TYPES)[number])}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'All Types' ? t : t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold">Detailed Movement History</h2>
          <p className="text-xs text-muted">
            Showing {filtered.length} of {total} entries
          </p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-low text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-4">Date & Time</th>
              <th className="px-5 py-4">Product / SKU</th>
              <th className="px-5 py-4">Change</th>
              <th className="px-5 py-4">Final Stock</th>
              <th className="px-5 py-4">Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-muted">
                  No inventory movements recorded yet.
                </td>
              </tr>
            )}
            {filtered.map((move) => (
              <tr key={move.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-4 text-muted">
                  {formatDate(move.createdAt)}
                  <br />
                  <span className="text-[11px]">
                    {new Date(move.createdAt).toLocaleTimeString()}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold">{move.product?.name ?? '—'}</p>
                  <p className="text-xs text-muted">
                    SKU: {move.variant?.sku || move.product?.sku || '—'}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={
                      move.quantityChange >= 0
                        ? 'font-semibold text-secondary'
                        : 'font-semibold text-error'
                    }
                  >
                    {move.quantityChange > 0 ? '+' : ''}
                    {move.quantityChange}
                  </span>
                  <p className="text-[11px] uppercase text-muted">{move.type}</p>
                </td>
                <td className="px-5 py-4">
                  {move.stockBefore} → {move.stockAfter}
                </td>
                <td className="px-5 py-4 text-muted">{move.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            className={secondaryBtnClass}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-xs text-muted">Page {page}</span>
          <button
            type="button"
            className={secondaryBtnClass}
            onClick={() => setPage((p) => p + 1)}
            disabled={filtered.length === 0}
          >
            Next
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">Low stock alerts</h2>
          <div className="mt-3 grid gap-2">
            {lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
              >
                <span className="font-semibold">
                  {p.name} · {p.stock} left
                </span>
                <button
                  type="button"
                  className={primaryBtnClass}
                  onClick={() => {
                    setAdjustProductId(p.id);
                    setAdjustQty('10');
                    setAdjustType('RESTOCK');
                  }}
                >
                  Restock
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </ShopShell>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'up' | 'warn';
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
        {tone === 'up' ? (
          <TrendingUp className="h-4 w-4 text-secondary" />
        ) : tone === 'warn' ? (
          <AlertTriangle className="h-4 w-4 text-warning" />
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p
        className={`mt-1 text-xs font-semibold ${
          tone === 'up' ? 'text-secondary' : tone === 'warn' ? 'text-warning' : 'text-muted'
        }`}
      >
        {hint}
      </p>
    </div>
  );
}
