'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { ShopShell } from '@/components/shop-shell';
import { getAccessToken, shopPartnerApi, type PartnerDashboard } from '@/lib/api';
import { formatInr } from '@/lib/format';

export default function ShopPartnerDashboardPage() {
  const [dashboard, setDashboard] = useState<PartnerDashboard | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    shopPartnerApi
      .getDashboard(token)
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const cards = dashboard
    ? [
        {
          label: 'Products',
          value: String(dashboard.productCount),
          hint: `${dashboard.activeProducts} active`,
        },
        {
          label: 'Paid Orders',
          value: String(dashboard.ordersTotal),
          hint: `${dashboard.ordersPending} pending fulfilment`,
        },
        { label: 'Low Stock', value: String(dashboard.lowStockCount), hint: 'Needs attention' },
        {
          label: 'Revenue',
          value: formatInr(dashboard.revenue, true),
          hint: `${dashboard.ordersShipped} shipped`,
        },
      ]
    : [];

  return (
    <ShopShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Shop Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Overview of catalog health, orders, and revenue for your tenant shop.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-3xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{card.value}</p>
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-secondary">
              <TrendingUp className="h-3.5 w-3.5" />
              {card.hint}
            </p>
          </article>
        ))}
        {!dashboard && !error && (
          <p className="col-span-full text-sm text-muted">Loading dashboard…</p>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Catalog</h2>
          </div>
          <p className="mt-2 text-sm text-muted">
            Manage product listings, pricing, and availability from the Products and Inventory
            pages.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/products" className="text-sm font-semibold text-primary">
              View products →
            </Link>
            <Link href="/inventory" className="text-sm font-semibold text-primary">
              Check stock →
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Fulfilment</h2>
          </div>
          <p className="mt-2 text-sm text-muted">
            Track paid orders and update shipping status as items leave your warehouse.
          </p>
          <Link href="/orders" className="mt-4 inline-block text-sm font-semibold text-primary">
            Manage orders →
          </Link>
        </section>

        {dashboard && dashboard.lowStockCount > 0 && (
          <section className="rounded-3xl border border-warning/30 bg-warning/5 p-6 lg:col-span-2">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-display text-lg font-semibold">Low stock alert</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              {dashboard.lowStockCount} product{dashboard.lowStockCount === 1 ? '' : 's'} or
              variants are below threshold. Restock soon to avoid missed sales.
            </p>
          </section>
        )}
      </div>
    </ShopShell>
  );
}
