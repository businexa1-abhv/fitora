'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminShell, primaryBtnClass, secondaryBtnClass } from '@/components/admin-shell';
import { ApiError, adminApi, getAccessToken, type CourtAdmin } from '@/lib/api';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function CourtsPage() {
  const [pending, setPending] = useState<CourtAdmin[]>([]);
  const [active, setActive] = useState<CourtAdmin[]>([]);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [pendingResult, activeResult] = await Promise.all([
        adminApi.listPendingCourts(token),
        adminApi.listCourts(token, { approvalStatus: 'APPROVED' }),
      ]);
      setPending(pendingResult.items);
      setActive(activeResult.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load courts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleActive = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return active;
    return active.filter(
      (court) =>
        court.name.toLowerCase().includes(query) ||
        court.city.toLowerCase().includes(query) ||
        court.owner?.email.toLowerCase().includes(query),
    );
  }, [active, search]);

  async function decide(court: CourtAdmin, approve: boolean) {
    const token = getAccessToken();
    if (!token) return;
    let reason = '';
    if (!approve) {
      reason = window.prompt('Rejection reason', 'Venue details require changes')?.trim() ?? '';
      if (!reason) return;
    }
    setBusyId(court.id);
    setError('');
    try {
      if (approve) await adminApi.approveCourt(token, court.id);
      else await adminApi.rejectCourt(token, court.id, reason);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Court review failed');
    } finally {
      setBusyId('');
    }
  }

  async function forceState(court: CourtAdmin, open: boolean) {
    const token = getAccessToken();
    if (!token) return;
    setBusyId(court.id);
    setError('');
    setNotice('');
    try {
      const result = open
        ? await adminApi.forceOpenCourt(token, court.id, date)
        : await adminApi.forceCloseCourt(token, court.id, date);
      setNotice(
        `${court.name}: ${result.updated} slot${result.updated === 1 ? '' : 's'} ${open ? 'opened' : 'closed'} for ${date}.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Court operation failed');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Court Management</h1>
          <p className="mt-1 text-sm text-muted">
            Review court registrations and control daily booking availability.
          </p>
        </div>
        <button type="button" className={secondaryBtnClass} onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 rounded-xl bg-success/10 px-4 py-3 text-sm text-secondary">
          {notice}
        </div>
      )}

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Pending Approval ({pending.length})
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {pending.map((court) => (
            <article
              key={court.id}
              className="rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{court.name}</h3>
                  <p className="text-sm text-muted">
                    {court.sport?.name ?? 'Court'} · {court.city}
                  </p>
                  <p className="mt-2 text-xs text-muted">{court.owner?.email ?? court.address}</p>
                </div>
                <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-bold uppercase text-warning">
                  Pending
                </span>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={busyId === court.id}
                  className={secondaryBtnClass}
                  onClick={() => void decide(court, false)}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busyId === court.id}
                  className={primaryBtnClass}
                  onClick={() => void decide(court, true)}
                >
                  Approve
                </button>
              </div>
            </article>
          ))}
          {!loading && pending.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-surface-low p-6 text-sm text-muted lg:col-span-2">
              No courts are awaiting approval.
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Active Courts</h2>
            <p className="text-xs text-muted">
              Force controls apply to every slot on the selected date.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-full border border-border bg-white px-4 py-2 text-sm"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courts..."
              className="rounded-full border border-border bg-white px-4 py-2 text-sm outline-none focus:border-primary-container"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-low text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Court</th>
                <th className="px-5 py-3 font-semibold">Sport</th>
                <th className="px-5 py-3 font-semibold">Location</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Daily controls</th>
              </tr>
            </thead>
            <tbody>
              {visibleActive.map((court) => (
                <tr key={court.id} className="border-t border-border/70">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{court.name}</p>
                    <p className="text-xs text-muted">{court.owner?.email}</p>
                  </td>
                  <td className="px-5 py-4">{court.sport?.name ?? '—'}</td>
                  <td className="px-5 py-4">{court.city}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold uppercase text-secondary">
                      {court.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === court.id || !date}
                        className={secondaryBtnClass}
                        onClick={() => void forceState(court, false)}
                      >
                        Force close
                      </button>
                      <button
                        type="button"
                        disabled={busyId === court.id || !date}
                        className={primaryBtnClass}
                        onClick={() => void forceState(court, true)}
                      >
                        Force open
                      </button>
                    </div>
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
