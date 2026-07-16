'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { AdminShell, primaryBtnClass } from '@/components/admin-shell';
import {
  adminApi,
  getAccessToken,
  type AnalyticsDashboard,
  type PartnerApplicationAdmin,
} from '@/lib/api';
import { formatInr } from '@/lib/format';
import { getRealtimeSocket } from '@/lib/realtime';

const LIVE_EVENTS = [
  'booking.created',
  'booking.cancelled',
  'slot:updated',
  'attendance.updated',
  'membership.updated',
  'payment.updated',
  'coach.updated',
  'player.updated',
] as const;

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    pendingKyc: 0,
    activeOwners: 0,
    underReview: 0,
    activated: 0,
  });
  const [pending, setPending] = useState<PartnerApplicationAdmin[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [livePulse, setLivePulse] = useState(0);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    void Promise.all([
      adminApi.partnerStats(token),
      adminApi.listApplications(token, { status: 'UNDER_REVIEW', page: 1 }),
      adminApi.getAnalyticsDashboard(token, { period: 'monthly' }),
    ]).then(([s, list, dashboard]) => {
      setStats(s);
      setPending(list.items.slice(0, 4));
      setAnalytics(dashboard);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, livePulse]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || typeof window === 'undefined') return;

    const socket = getRealtimeSocket(token);
    const onEvent = () => setLivePulse((n) => n + 1);
    for (const event of LIVE_EVENTS) {
      socket.on(event, onEvent);
    }
    return () => {
      for (const event of LIVE_EVENTS) {
        socket.off(event, onEvent);
      }
    };
  }, []);

  const revenueSeries = useMemo(() => analytics?.revenue.series ?? [], [analytics]);
  const maxRevenue = useMemo(
    () => Math.max(...revenueSeries.map((p) => p.value), 1),
    [revenueSeries],
  );

  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Platform Overview</h1>
          <p className="mt-1 text-sm text-muted">
            Strategic insights and operational performance for FitOra India.
            {livePulse > 0 ? ` · Live updates: ${livePulse}` : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-border bg-white px-4 py-2 text-sm"
          >
            Last 12 Months
          </button>
          <button type="button" className={primaryBtnClass}>
            Full Data Export
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Pending KYC', value: String(stats.pendingKyc), delta: 'Needs review' },
          { label: 'Active Owners', value: String(stats.activeOwners), delta: 'Live tenants' },
          { label: 'Under Review', value: String(stats.underReview), delta: 'In queue' },
          { label: 'Activated Partners', value: String(stats.activated), delta: 'Approved' },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-3xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{card.value}</p>
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-secondary">
              <TrendingUp className="h-3.5 w-3.5" />
              {card.delta}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Revenue Analytics</h2>
              <p className="mt-1 text-sm text-muted">
                Monthly paid revenue from platform payments.
              </p>
            </div>
            {analytics && (
              <p className="font-display text-lg font-bold text-primary">
                {formatInr(analytics.revenue.total, true)}
              </p>
            )}
          </div>
          {revenueSeries.length === 0 ? (
            <p className="mt-8 text-sm text-muted">No revenue data for this period.</p>
          ) : (
            <div className="mt-8 flex h-56 items-end gap-2 overflow-x-auto px-2">
              {revenueSeries.map((point) => {
                const heightPct = Math.max(4, (point.value / maxRevenue) * 100);
                return (
                  <div
                    key={point.key}
                    className="flex min-w-[2.5rem] flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className="flex w-full items-end justify-center"
                      style={{ height: '180px' }}
                      title={formatInr(point.value)}
                    >
                      <div
                        className="w-full max-w-8 rounded-t bg-primary-container"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] uppercase text-muted">{point.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Pending KYC{' '}
              <span className="ml-2 rounded-full bg-error/10 px-2 py-0.5 text-xs font-bold text-error">
                {stats.pendingKyc} New
              </span>
            </h2>
            <Link href="/owners" className="text-sm font-semibold text-primary">
              View All
            </Link>
          </div>
          <ul className="mt-5 space-y-3">
            {pending.length === 0 && (
              <li className="rounded-2xl bg-surface-low px-4 py-3 text-sm text-muted">
                No pending partner applications.
              </li>
            )}
            {pending.map((app) => (
              <li key={app.id} className="rounded-2xl bg-surface-low px-4 py-3">
                <p className="font-semibold">{app.businessName}</p>
                <p className="text-xs text-muted">
                  {app.ownerName} · {app.city}
                </p>
                <Link
                  href={`/owners/${app.id}`}
                  className="mt-2 inline-block text-xs font-semibold text-primary"
                >
                  Review KYC →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
