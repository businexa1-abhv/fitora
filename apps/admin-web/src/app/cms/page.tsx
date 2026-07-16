'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { adminApi, getAccessToken, type Sport } from '@/lib/api';

export default function CmsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    setLoading(true);
    setError(null);
    void adminApi
      .listSports(token ?? undefined)
      .then(setSports)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Platform Configuration</h1>
          <p className="mt-1 text-sm text-muted">
            Manage global services, regional accessibility, and marketing assets.
          </p>
        </div>
        <p className="text-sm text-muted">Read-only · sports catalog from API</p>
      </div>

      {error && (
        <p className="mb-4 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Service Management</h2>
        {loading && <p className="mt-5 text-sm text-muted">Loading sports…</p>}
        {!loading && sports.length === 0 && (
          <p className="mt-5 text-sm text-muted">No sports configured yet.</p>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <article key={sport.id} className="rounded-2xl border border-border bg-surface-low p-4">
              <p className="font-semibold">{sport.name}</p>
              <p className="mt-1 text-sm text-muted">{sport.slug}</p>
              {sport.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted">{sport.description}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
