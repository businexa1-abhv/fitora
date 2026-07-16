'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShopShell } from '@/components/shop-shell';
import { getAccessToken, shopPartnerApi, type ShopOrder } from '@/lib/api';
import { formatDate, formatInr } from '@/lib/format';

const STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export default function OrdersPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    shopPartnerApi
      .listOrders(token)
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function updateStatus(orderId: string, status: string) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await shopPartnerApi.updateOrderStatus(token, orderId, { status });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  }

  return (
    <ShopShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Orders</h1>
        <p className="mt-1 text-sm text-muted">Paid shop orders containing your tenant products.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-low text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Placed</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-muted">
                  Loading orders…
                </td>
              </tr>
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-muted">
                  No paid orders yet.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-4 font-semibold">{order.orderNumber}</td>
                <td className="px-5 py-4">
                  {order.user ? `${order.user.firstName} ${order.user.lastName}`.trim() : '—'}
                  {order.user?.email && <p className="text-xs text-muted">{order.user.email}</p>}
                </td>
                <td className="px-5 py-4">{formatInr(Number(order.totalAmount))}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-surface-high px-2.5 py-1 text-xs font-semibold">
                    {order.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-muted">{formatDate(order.createdAt)}</td>
                <td className="px-5 py-4">
                  <select
                    className="rounded-lg border border-border bg-white px-2 py-1 text-xs"
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ShopShell>
  );
}
