'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AdminShell, primaryBtnClass } from '@/components/admin-shell';
import { adminApi, getAccessToken, type PartnerApplicationAdmin } from '@/lib/api';

function timeAgo(value?: string | null) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.round(diff / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function OwnersPage() {
  const [stats, setStats] = useState({ pendingKyc: 0, activeOwners: 0 });
  const [queue, setQueue] = useState<PartnerApplicationAdmin[]>([]);
  const [owners, setOwners] = useState<PartnerApplicationAdmin[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(q = search) {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [s, pending, all] = await Promise.all([
        adminApi.partnerStats(token),
        adminApi.listApplications(token, { status: 'UNDER_REVIEW', search: q || undefined }),
        adminApi.listApplications(token, { search: q || undefined }),
      ]);
      setStats({ pendingKyc: s.pendingKyc, activeOwners: s.activeOwners });
      setQueue(pending.items);
      setOwners(all.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Owner Management</h1>
          <p className="mt-1 text-sm text-muted">Review, verify, and manage venue partnerships.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl bg-warning/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-warning">Pending KYC</p>
            <p className="font-display text-2xl font-bold">{stats.pendingKyc}</p>
          </div>
          <div className="rounded-2xl bg-success/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-secondary">Active Owners</p>
            <p className="font-display text-2xl font-bold">{stats.activeOwners}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-3">
        <input
          className="max-w-md flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-primary-container"
          placeholder="Search owners or facilities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load(search);
          }}
        />
        <button type="button" className={primaryBtnClass} onClick={() => void load(search)}>
          Search
        </button>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Verification Queue
        </h2>
        {loading && <p className="text-sm text-muted">Loading…</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {queue.map((app) => (
            <article
              key={app.id}
              className="rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{app.businessName}</h3>
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
                      Urgent
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Submitted {timeAgo(app.submittedAt)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm">
                <span className="text-muted">Owner:</span> {app.ownerName}
              </p>
              <p className="text-sm">
                <span className="text-muted">Location:</span> {app.city}
                {app.state ? `, ${app.state}` : ''}
              </p>
              <Link href={`/owners/${app.id}`} className={`${primaryBtnClass} mt-4`}>
                Review KYC
              </Link>
            </article>
          ))}
          {!loading && queue.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-surface-low p-6 text-sm text-muted lg:col-span-2">
              Queue is clear. New partner registrations will appear here after submission.
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-xl font-semibold">Partner Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-low text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Owner Entity</th>
                <th className="px-5 py-3 font-semibold">Facilities</th>
                <th className="px-5 py-3 font-semibold">City</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((app) => (
                <tr key={app.id} className="border-t border-border/70">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{app.businessName}</p>
                    <p className="text-xs text-muted">{app.email}</p>
                  </td>
                  <td className="px-5 py-4">{app.tenant?._count?.courts ?? '—'}</td>
                  <td className="px-5 py-4">{app.city}</td>
                  <td className="px-5 py-4">
                    <StatusPill status={app.status} />
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/owners/${app.id}`} className="font-semibold text-primary">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    UNDER_REVIEW: 'bg-warning/15 text-warning',
    ACTIVATED: 'bg-success/15 text-secondary',
    REJECTED: 'bg-error/15 text-error',
    SUBMITTED: 'bg-info/15 text-info',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${map[status] ?? 'bg-surface-high text-muted'}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
