'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { AdminShell, primaryBtnClass } from '@/components/admin-shell';
import { adminApi, getAccessToken, type PartnerApplicationAdmin } from '@/lib/api';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    pendingKyc: 0,
    activeOwners: 0,
    underReview: 0,
    activated: 0,
  });
  const [pending, setPending] = useState<PartnerApplicationAdmin[]>([]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    void Promise.all([
      adminApi.partnerStats(token),
      adminApi.listApplications(token, { status: 'UNDER_REVIEW', page: 1 }),
    ]).then(([s, list]) => {
      setStats(s);
      setPending(list.items.slice(0, 4));
    });
  }, []);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Platform Overview</h1>
          <p className="mt-1 text-sm text-muted">
            Strategic insights and operational performance for FitOra India.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-border bg-white px-4 py-2 text-sm"
          >
            Last 30 Days
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
          <h2 className="font-display text-xl font-semibold">Revenue Analytics</h2>
          <p className="mt-1 text-sm text-muted">
            Commission vs subscription trends (demo visualization).
          </p>
          <div className="mt-8 flex h-56 items-end gap-3 px-2">
            {[40, 55, 48, 70, 62, 80].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="flex w-full items-end justify-center gap-1"
                  style={{ height: '180px' }}
                >
                  <div className="w-3 rounded-t bg-primary-container" style={{ height: `${h}%` }} />
                  <div className="w-3 rounded-t bg-info" style={{ height: `${h * 0.7}%` }} />
                </div>
                <span className="text-[10px] uppercase text-muted">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}
                </span>
              </div>
            ))}
          </div>
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
