'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatCard } from '@/components/owner/owner-stat-card';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getPrinterDashboard } from '@/lib/print';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ClipboardList, Package, Truck, Palette } from 'lucide-react';

export default function PrinterDashboardPage() {
  const token = useAuthToken();

  const query = useQuery({
    queryKey: ['printer', 'dashboard'],
    queryFn: () => getPrinterDashboard(token!),
    enabled: !!token,
  });

  const dashboard = query.data;

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        title="Printer dashboard"
        description="Manage print orders and design approvals"
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
                icon={Package}
              />
              <OwnerStatCard
                label="Total orders"
                value={String(dashboard.orderCount)}
                icon={ClipboardList}
              />
              <OwnerStatCard
                label="Awaiting approval"
                value={String(dashboard.awaitingProofApproval)}
                icon={Palette}
              />
              <OwnerStatCard
                label="In production"
                value={String(dashboard.inProduction)}
                icon={Truck}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border px-6 py-4 flex justify-between items-center">
                <h2 className="font-bold">Recent orders</h2>
                <Link href="/printer/orders" className="text-sm text-primary font-medium">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-border">
                {dashboard.recentOrders.map((o) => (
                  <div key={o.id} className="px-6 py-4 flex justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">{o.orderNumber}</p>
                      <p className="text-xs text-muted">
                        {o.quantity}x {o.tshirtSize} · {o.user?.firstName}
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
