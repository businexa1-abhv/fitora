'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminShell, primaryBtnClass, secondaryBtnClass } from '@/components/admin-shell';
import { ApiError, adminApi, getAccessToken, type PartnerApplicationAdmin } from '@/lib/api';

export default function OwnerReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<PartnerApplicationAdmin | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !params.id) return;
    void adminApi
      .getApplication(token, params.id)
      .then(setApp)
      .catch(() => setApp(null));
  }, [params.id]);

  async function approve() {
    const token = getAccessToken();
    if (!token || !app) return;
    setBusy(true);
    setError('');
    try {
      const updated = await adminApi.approveApplication(token, app.id);
      setApp(updated);
      router.push('/owners');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Approve failed');
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    const token = getAccessToken();
    if (!token || !app) return;
    const reason = window.prompt('Rejection reason', 'Documents unclear') ?? undefined;
    setBusy(true);
    setError('');
    try {
      const updated = await adminApi.rejectApplication(token, app.id, reason);
      setApp(updated);
      router.push('/owners');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  }

  if (!app) {
    return (
      <AdminShell>
        <p className="text-muted">Loading application…</p>
      </AdminShell>
    );
  }

  const legal = (app.legal ?? {}) as Record<string, string>;
  const sports = Array.isArray((app.sportsConfig as { items?: unknown[] } | null)?.items)
    ? (
        app.sportsConfig as {
          items: Array<{ sportSlug: string; courtCount: number; standardRate: number }>;
        }
      ).items
    : [];
  const courtCount = app.tenant?._count?.courts ?? 0;
  const needsCourtRepair = app.status === 'ACTIVATED' && courtCount === 0;
  const canApprove =
    !busy && app.status !== 'REJECTED' && (app.status !== 'ACTIVATED' || needsCourtRepair);

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/owners" className="text-sm font-medium text-muted">
            ← Back to queue
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold">{app.businessName}</h1>
          <p className="text-sm text-muted">
            {app.ownerName} · {app.email} · {app.phone}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy || app.status === 'REJECTED' || app.status === 'ACTIVATED'}
            className={secondaryBtnClass}
            onClick={() => void reject()}
          >
            Reject
          </button>
          <button
            type="button"
            disabled={!canApprove}
            className={primaryBtnClass}
            onClick={() => void approve()}
          >
            {busy
              ? 'Working…'
              : needsCourtRepair
                ? 'Provision Courts & Go Live'
                : 'Approve & Go Live'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {needsCourtRepair && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tenant is ACTIVE but has 0 courts — the venue will not appear in the player app until
          courts are provisioned.
        </div>
      )}

      {app.status === 'ACTIVATED' && !needsCourtRepair && (
        <div className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-secondary">
          Activated. Tenant is ACTIVE and courts are approved — visible in the player app.
          {` (${courtCount} courts)`}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Business & Venue</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Address</dt>
              <dd className="font-medium">
                {app.venueAddress}, {app.city}, {app.state} {app.pincode}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd className="font-medium">{app.status}</dd>
            </div>
            <div>
              <dt className="text-muted">Tenant</dt>
              <dd className="font-medium">
                {app.tenant?.name ?? '—'} ({app.tenant?.status ?? 'n/a'})
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Legal & Banking</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">GST</dt>
              <dd className="font-medium">{legal.gstNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">PAN</dt>
              <dd className="font-medium">{legal.panNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Aadhaar</dt>
              <dd className="font-medium">{legal.aadhaarNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">IFSC</dt>
              <dd className="font-medium">{legal.ifscCode || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 xl:col-span-2">
          <h2 className="font-display text-lg font-semibold">Sports & Courts</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sports.map((item) => (
              <div key={item.sportSlug} className="rounded-2xl bg-surface-low p-4 text-sm">
                <p className="font-semibold capitalize">{item.sportSlug}</p>
                <p className="text-muted">
                  {item.courtCount} courts · ₹{item.standardRate}/slot
                </p>
              </div>
            ))}
            {(app.tenant?.courts ?? []).map((court) => (
              <div key={court.id} className="rounded-2xl border border-border p-4 text-sm">
                <p className="font-semibold">{court.name}</p>
                <p className="text-muted">
                  {court.sport?.name} · {court.approvalStatus}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
