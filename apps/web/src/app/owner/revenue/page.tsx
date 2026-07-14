'use client';

import React from 'react';

import { useQuery } from '@tanstack/react-query';
import { IndianRupee, TrendingUp, CalendarDays, BadgeCheck } from 'lucide-react';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatCard } from '@/components/owner/owner-stat-card';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getOwnerDashboard } from '@/lib/owner-analytics';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatCurrency } from '@/lib/owner-utils';

export default function OwnerRevenuePage(): React.JSX.Element {
  const token = useAuthToken();

  const query = useQuery({
    queryKey: ['owner', 'dashboard', 'revenue'],
    queryFn: () => getOwnerDashboard(token!, { period: 'monthly' }),
    enabled: !!token,
  });

  const data = query.data;
  const monthly = data?.monthlyTrend ?? [];
  const maxAmount = monthly.length ? Math.max(...monthly.map((m) => m.amount)) : 1;
  const lastMonth = monthly.length >= 2 ? monthly[monthly.length - 2].amount : 0;
  const thisMonth = monthly.length ? monthly[monthly.length - 1].amount : 0;
  const membershipMrr = data?.revenueBreakdown.find((r) => r.source === 'Memberships')?.amount ?? 0;
  const bookingRevenue = data?.revenueBreakdown.find((r) => r.source === 'Court bookings')?.amount ?? 0;
  const bookingsMtd = data?.stats.bookingsMtd ?? 0;
  const avgBooking = bookingsMtd > 0 ? bookingRevenue / bookingsMtd : 0;

  return (
    <div className="space-y-8">
      <OwnerPageHeader title="Revenue" description="Earnings breakdown across your venues" />

      <QueryBoundary
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
      >
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <OwnerStatCard
                label="This month"
                value={formatCurrency(data.stats.revenueMtd)}
                change={
                  lastMonth > 0
                    ? `${Math.round(((thisMonth - lastMonth) / lastMonth) * 100)}% vs last month`
                    : undefined
                }
                trend={thisMonth >= lastMonth ? 'up' : 'down'}
                icon={IndianRupee}
              />
              <OwnerStatCard label="Last month" value={formatCurrency(lastMonth)} icon={TrendingUp} />
              <OwnerStatCard
                label="Avg. booking value"
                value={formatCurrency(avgBooking)}
                icon={CalendarDays}
              />
              <OwnerStatCard
                label="Membership MRR"
                value={formatCurrency(membershipMrr)}
                icon={BadgeCheck}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
                <h2 className="font-bold mb-6">Monthly trend</h2>
                {monthly.length === 0 ? (
                  <p className="text-sm text-muted text-center py-12">No revenue data yet</p>
                ) : (
                  <div className="flex items-end gap-3 h-48">
                    {monthly.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-lg bg-primary/80 hover:bg-primary transition-colors"
                          style={{ height: `${(m.amount / maxAmount) * 100}%`, minHeight: '8px' }}
                          title={formatCurrency(m.amount)}
                        />
                        <span className="text-xs text-muted">{m.month}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
                <h2 className="font-bold mb-4">Revenue by source</h2>
                <div className="space-y-4">
                  {data.revenueBreakdown.map((item) => (
                    <div key={item.source}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium">{item.source}</span>
                        <span className="text-muted">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-background overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${item.share}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
