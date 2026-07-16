'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShopShell } from '@/components/shop-shell';
import { getAccessToken, shopPartnerApi, type PartnerDashboard, type ShopOrder } from '@/lib/api';
import { formatDate, formatInr } from '@/lib/format';

export default function RevenuePage() {
  const [dashboard, setDashboard] = useState<PartnerDashboard | null>(null);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    Promise.all([shopPartnerApi.getDashboard(token), shopPartnerApi.listOrders(token)])
      .then(([dash, orderList]) => {
        setDashboard(dash);
        setOrders(orderList);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load revenue'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recentRevenue = useMemo(
    () => orders.slice(0, 10).reduce((sum, o) => sum + Number(o.totalAmount), 0),
    [orders],
  );

  return (
    <ShopShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Revenue</h1>
        <p className="mt-1 text-sm text-muted">
          Paid order revenue for your tenant shop. Settlements from admin payouts coming soon.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted">Lifetime revenue</p>
          <p className="mt-2 font-display text-3xl font-bold text-primary">
            {dashboard ? formatInr(dashboard.revenue) : '—'}
          </p>
        </article>
        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted">Paid orders</p>
          <p className="mt-2 font-display text-3xl font-bold">{dashboard?.ordersTotal ?? '—'}</p>
        </article>
        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted">Recent 10 orders</p>
          <p className="mt-2 font-display text-3xl font-bold">{formatInr(recentRevenue)}</p>
        </article>
      </div>

      <section className="mt-8 rounded-3xl border border-dashed border-border bg-surface-low p-6">
        <h2 className="font-display text-lg font-semibold">Settlements</h2>
        <p className="mt-2 text-sm text-muted">
          Payout settlements will appear here once admin finance releases partner disbursements.
          Until then, use order totals below as your payment report.
        </p>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <h2 className="border-b border-border px-5 py-4 font-display text-lg font-semibold">
          Payment report (from orders)
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-low text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-muted">
                  No paid orders to report yet.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-4 font-semibold">{order.orderNumber}</td>
                <td className="px-5 py-4">{formatInr(Number(order.totalAmount))}</td>
                <td className="px-5 py-4">{order.paymentStatus}</td>
                <td className="px-5 py-4 text-muted">{formatDate(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ShopShell>
  );
}
