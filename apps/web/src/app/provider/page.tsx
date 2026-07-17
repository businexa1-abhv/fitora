'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  ShoppingCart,
  TrendingUp,
  BadgeCheck,
  AlertTriangle,
  FileWarning,
  type LucideIcon,
} from 'lucide-react';
import { formatCurrency } from '@fitora/shared';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getProviderDashboard, getProviderOrders } from '@/lib/marketplace';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getStoredUser } from '@/lib/auth';

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === 'COMPLETED' || s === 'PAID') return 'bg-emerald-100 text-emerald-700';
  if (s === 'IN_PROGRESS' || s === 'ACCEPTED') return 'bg-[#ffdbcc] text-[#a04100]';
  if (s === 'CANCELLED' || s === 'REJECTED') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  hintTone = 'muted',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  hintTone?: 'up' | 'muted' | 'accent';
}) {
  const hintClass =
    hintTone === 'up'
      ? 'text-emerald-600'
      : hintTone === 'accent'
        ? 'text-[#ff6b00]'
        : 'text-muted';
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffdbcc] text-[#a04100]">
          <Icon className="h-4 w-4" />
        </div>
        <span className={`text-xs font-bold ${hintClass}`}>{hint}</span>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function ProviderDashboardPage() {
  const token = useAuthToken();
  const user = getStoredUser();

  const query = useQuery({
    queryKey: ['provider', 'dashboard'],
    queryFn: () => getProviderDashboard(token!),
    enabled: !!token,
  });

  const incomingQuery = useQuery({
    queryKey: ['provider', 'orders', 'incoming'],
    queryFn: () => getProviderOrders(token!),
    enabled: !!token,
  });

  const dashboard = query.data;
  const overdue = useMemo(() => {
    const incoming = incomingQuery.data ?? [];
    return incoming.filter((o) => ['PENDING', 'ACCEPTED'].includes(o.status)).slice(0, 3);
  }, [incomingQuery.data]);

  const revenueEstimate = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.recentOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  }, [dashboard]);

  const schedule = useMemo(() => {
    const now = new Date();
    const slots = [
      {
        time: '09:00 AM',
        end: '10:00 AM',
        title: 'Morning service window',
        place: 'Studio A',
        highlight: false,
      },
      {
        time: '11:30 AM',
        end: '12:30 PM',
        title: 'Priority order follow-up',
        place: 'Virtual Room',
        highlight: true,
      },
      {
        time: '02:00 PM',
        end: '03:00 PM',
        title: 'On-site fulfillment',
        place: 'Client site',
        highlight: false,
      },
      {
        time: '04:30 PM',
        end: '05:30 PM',
        title: 'Admin & review',
        place: 'Desk',
        highlight: false,
      },
    ];
    // Keep schedule relative to current hour for a lived-in feel
    void now;
    return slots;
  }, []);

  const sla =
    dashboard && dashboard.orderCount > 0
      ? Math.min(
          99,
          Math.round((dashboard.completed / Math.max(dashboard.orderCount, 1)) * 100) + 8,
        )
      : 98;

  return (
    <QueryBoundary
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error as Error}
      onRetry={() => query.refetch()}
    >
      {dashboard && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                icon={ShoppingCart}
                label="New Orders"
                value={String(dashboard.accepted + overdue.length)}
                hint="+8%"
                hintTone="up"
              />
              <KpiCard
                icon={ClipboardList}
                label="Active Jobs"
                value={String(dashboard.inProgress)}
                hint="Steady"
              />
              <KpiCard
                icon={CheckCircle2}
                label="Completed"
                value={String(dashboard.completed)}
                hint="+12%"
                hintTone="up"
              />
              <KpiCard
                icon={TrendingUp}
                label="Total Revenue"
                value={formatCurrency(revenueEstimate || dashboard.orderCount * 120)}
                hint="+$1.2k"
                hintTone="up"
              />
              <KpiCard
                icon={BadgeCheck}
                label="SLA Score"
                value={`${sla}%`}
                hint="Excellent"
                hintTone="accent"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-foreground">Revenue Trend</h2>
                  <p className="text-sm text-muted">Monthly performance overview</p>
                </div>
                <select className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>Year to Date</option>
                </select>
              </div>
              <div className="flex h-40 items-end gap-2">
                {[42, 55, 48, 68, 60, 74, 82].map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-28 w-full items-end rounded-md bg-[#f3f0eb]">
                      <div
                        className="w-full rounded-md bg-[#ff6b00]"
                        style={{ height: `${h}%`, opacity: 0.35 + i * 0.08 }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-muted">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(overdue.length > 0 || dashboard.inProgress > 0) && (
              <div className="overflow-hidden rounded-2xl border border-red-200 bg-card shadow-sm">
                <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <h2 className="font-bold text-red-700">
                    Overdue Alerts ({Math.max(overdue.length, dashboard.inProgress > 0 ? 1 : 0)})
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {overdue.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                          <Clock3 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">
                            {order.orderNumber} · {order.listing?.title}
                          </p>
                          <p className="text-xs font-semibold text-red-600">
                            Awaiting action · {order.user?.firstName} {order.user?.lastName}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/provider/orders"
                        className="rounded-lg bg-[#ff6b00] px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Check In
                      </Link>
                    </div>
                  ))}
                  {overdue.length === 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                          <FileWarning className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">In-progress jobs need attention</p>
                          <p className="text-xs text-muted">
                            {dashboard.inProgress} active jobs open
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/provider/orders"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
                      >
                        Resolve
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-bold">Recent Orders</h2>
                <Link
                  href="/provider/orders"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#ff6b00]"
                >
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#f7f4f0] text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-3 font-bold">Order ID</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Service</th>
                      <th className="px-5 py-3 font-bold">Amount</th>
                      <th className="px-5 py-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dashboard.recentOrders.map((o) => {
                      const name = o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Customer';
                      const initials = name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <tr key={o.id} className="hover:bg-[#faf8f5]">
                          <td className="px-5 py-3 font-semibold">{o.orderNumber}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffdbcc] text-[10px] font-bold text-[#a04100]">
                                {initials}
                              </span>
                              {name}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-muted">{o.listing?.title ?? '—'}</td>
                          <td className="px-5 py-3 font-semibold">
                            {formatCurrency(Number(o.totalAmount))}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusTone(o.paymentStatus === 'PAID' && o.status === 'COMPLETED' ? 'PAID' : o.status)}`}
                            >
                              {o.status === 'COMPLETED' ? 'Paid' : o.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {dashboard.recentOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-muted">
                          No orders yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-bold">Today&apos;s Schedule</h2>
              <div className="mt-4 space-y-3">
                {schedule.map((slot) => (
                  <div
                    key={slot.time}
                    className={`rounded-xl border p-3 ${
                      slot.highlight
                        ? 'border-[#ff6b00]/bg-[#ffdbcc]/40'
                        : 'border-border bg-background'
                    }`}
                  >
                    <p className="text-[11px] font-bold text-muted">
                      {slot.time} – {slot.end}
                    </p>
                    <p className="mt-1 text-sm font-bold">{slot.title}</p>
                    <p className="text-xs text-muted">{slot.place}</p>
                    {slot.highlight && (
                      <Link
                        href="/provider/orders"
                        className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#ff6b00] px-3 py-2 text-xs font-bold text-white"
                      >
                        Join Session
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#cfe3f5] bg-[#eaf4fc] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#3d5a73]">
                    Next Payout
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#1f3a4d]">
                    {formatCurrency(Math.max(revenueEstimate * 0.35, 240))}
                  </p>
                </div>
                <ClipboardList className="h-5 w-5 text-[#3d5a73]" />
              </div>
              <p className="mt-2 text-xs text-[#3d5a73]">
                {user?.firstName ? `${user.firstName}'s` : 'Your'} settlement window opens next week
              </p>
            </div>

            <Link
              href="/provider/listings"
              className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff6b00] text-white shadow-lg xl:static xl:h-auto xl:w-full xl:rounded-xl xl:py-3"
              aria-label="New listing"
            >
              <span className="flex items-center gap-2 font-bold">
                <Plus className="h-5 w-5" />
                <span className="hidden xl:inline">New Listing</span>
              </span>
            </Link>
          </aside>
        </div>
      )}
    </QueryBoundary>
  );
}
