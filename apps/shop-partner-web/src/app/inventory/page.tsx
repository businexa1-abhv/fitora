'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShopShell, primaryBtnClass } from '@/components/shop-shell';
import {
  getAccessToken,
  shopPartnerApi,
  type InventoryMovement,
  type ShopProduct,
} from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function InventoryPage() {
  const [lowStock, setLowStock] = useState<ShopProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    Promise.all([shopPartnerApi.getLowStock(token), shopPartnerApi.listInventoryMovements(token)])
      .then(([stock, moves]) => {
        setLowStock(stock.products);
        setMovements(moves.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load inventory'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function restock(product: ShopProduct) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await shopPartnerApi.adjustInventory(token, {
        productId: product.id,
        quantityChange: 10,
        type: 'RESTOCK',
        reason: 'Partner portal restock',
      });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restock failed');
    }
  }

  return (
    <ShopShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Inventory</h1>
        <p className="mt-1 text-sm text-muted">Low-stock alerts and recent stock movements.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold">Low stock</h2>
        <div className="mt-4 grid gap-3">
          {loading && <p className="text-sm text-muted">Loading…</p>}
          {!loading && lowStock.length === 0 && (
            <p className="rounded-2xl bg-surface-low px-4 py-3 text-sm text-muted">
              All products are above threshold.
            </p>
          )}
          {lowStock.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-xs text-muted">
                  {product.stock} left · threshold {product.lowStockThreshold}
                </p>
              </div>
              <button type="button" className={primaryBtnClass} onClick={() => restock(product)}>
                +10 restock
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">Recent movements</h2>
        <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-low text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Change</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">When</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-muted">
                    No inventory movements recorded yet.
                  </td>
                </tr>
              )}
              {movements.map((move) => (
                <tr key={move.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-4">{move.product?.name ?? '—'}</td>
                  <td className="px-5 py-4">{move.type}</td>
                  <td className="px-5 py-4">
                    {move.quantityChange > 0 ? '+' : ''}
                    {move.quantityChange}
                  </td>
                  <td className="px-5 py-4">
                    {move.stockBefore} → {move.stockAfter}
                  </td>
                  <td className="px-5 py-4 text-muted">{formatDate(move.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </ShopShell>
  );
}
