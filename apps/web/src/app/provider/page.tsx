'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatCard } from '@/components/owner/owner-stat-card';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getProviderDashboard } from '@/lib/marketplace';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ClipboardList, CheckCircle, Wrench, Clock } from 'lucide-react';

export default function ProviderDashboardPage() {
  const token = useAuthToken();

  const query = useQuery({
    queryKey: ['provider', 'dashboard'],
    queryFn: () => getProviderDashboard(token!),
    enabled: !!token,
  });

  const dashboard = query.data;

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        title="Provider dashboard"
        description="Manage service bookings and track order status"
      />

      <QueryBoundary
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
      >
        {dashboard && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <OwnerStatCard
                label="Active listings"
                value={String(dashboard.listingCount)}
                icon={Wrench}
              />
              <OwnerStatCard
                label="Total orders"
                value={String(dashboard.orderCount)}
                icon={ClipboardList}
              />
              <OwnerStatCard
                label="In progress"
                value={String(dashboard.inProgress)}
                icon={Clock}
              />
              <OwnerStatCard
                label="Completed"
                value={String(dashboard.completed)}
                icon={CheckCircle}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border px-6 py-4 flex justify-between items-center">
                <h2 className="font-bold">Recent orders</h2>
                <Link href="/provider/orders" className="text-sm text-primary font-medium">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-border">
                {dashboard.recentOrders.map((o) => (
                  <div key={o.id} className="px-6 py-4 flex justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">{o.orderNumber}</p>
                      <p className="text-xs text-muted">
                        {o.listing?.title} · {o.user?.firstName}
                      </p>
                    </div>
                    <span className="text-xs font-semibold rounded-full bg-primary-light text-primary px-2.5 py-1">
                      {o.status}
                    </span>
                  </div>
                ))}
                {dashboard.recentOrders.length === 0 && (
                  <p className="px-6 py-8 text-sm text-muted text-center">No orders yet</p>
                )}
              </div>
            </div>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
