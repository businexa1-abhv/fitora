'use client';

import React from 'react';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CalendarDays,
  IndianRupee,
  BadgeCheck,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatCard } from '@/components/owner/owner-stat-card';
import { OwnerStatusBadge } from '@/components/owner/owner-status-badge';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getStoredUser } from '@/lib/auth';
import { getOwnerDashboard } from '@/lib/owner-analytics';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatCurrency } from '@/lib/owner-utils';

export default function OwnerDashboardPage(): React.JSX.Element {
  const user = getStoredUser();
  const token = useAuthToken();

  const query = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => getOwnerDashboard(token!, { period: 'monthly' }),
    enabled: !!token,
  });

  const data = query.data;

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        title={`Welcome, ${user?.firstName ?? 'Owner'}`}
        description="Your venue performance at a glance"
        actions={
          <Link href="/owner/courts/new" className="btn-primary">
            + Add court
          </Link>
        }
      />

      <QueryBoundary
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
      >
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <OwnerStatCard
                label="Revenue (MTD)"
                value={formatCurrency(data.stats.revenueMtd)}
                icon={IndianRupee}
              />
              <OwnerStatCard
                label="Bookings today"
                value={String(data.stats.bookingsToday)}
                change={
                  data.stats.bookingsMtd > data.stats.bookingsToday
                    ? `${data.stats.bookingsMtd} this month`
                    : undefined
                }
                icon={CalendarDays}
              />
              <OwnerStatCard
                label="Active courts"
                value={String(data.stats.activeCourts)}
                change={
                  data.stats.pendingCourts > 0
                    ? `${data.stats.pendingCourts} pending approval`
                    : 'All approved'
                }
                icon={Building2}
              />
              <OwnerStatCard
                label="Members"
                value={String(data.stats.activeMembers)}
                icon={BadgeCheck}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <h2 className="font-bold">Recent bookings</h2>
                  <Link
                    href="/owner/bookings"
                    className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
                  >
                    View all <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="divide-y divide-border">
                  {data.recentBookings.length === 0 && (
                    <p className="px-6 py-8 text-sm text-muted text-center">No bookings yet</p>
                  )}
                  {data.recentBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-4 px-6 py-4">
                      <div>
                        <p className="font-medium text-sm">{b.userName}</p>
                        <p className="text-xs text-muted">
                          {b.courtName} ·{' '}
                          {new Date(b.time).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(b.amount)}</p>
                        <OwnerStatusBadge status={b.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
                <h2 className="font-bold mb-4">Quick actions</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      href: '/owner/slots',
                      label: 'Manage slots',
                      desc: 'Generate & view slots',
                      icon: Clock,
                    },
                    {
                      href: '/owner/memberships',
                      label: 'Membership plans',
                      desc: 'Create & edit plans',
                      icon: BadgeCheck,
                    },
                    {
                      href: '/owner/training',
                      label: 'Kids training',
                      desc: 'Programs & batches',
                      icon: CalendarDays,
                    },
                    {
                      href: '/owner/trainers',
                      label: 'Assign trainers',
                      desc: 'Manage coaching staff',
                      icon: Building2,
                    },
                  ].map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="flex items-start gap-3 rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-primary-light/20 transition-all"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light shrink-0">
                        <action.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{action.label}</p>
                        <p className="text-xs text-muted">{action.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {data.courts.length > 0 && (
              <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">Your courts</h2>
                  <Link href="/owner/courts" className="text-sm text-primary font-medium hover:underline">
                    Manage all
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.courts.slice(0, 3).map((court) => (
                    <Link
                      key={court.id}
                      href={`/owner/courts/${court.id}/slots`}
                      className="rounded-xl border border-border p-4 hover:border-primary transition-colors"
                    >
                      <p className="font-semibold">{court.name}</p>
                      {!court.isApproved && (
                        <span className="mt-2 inline-block rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                          Pending approval
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
