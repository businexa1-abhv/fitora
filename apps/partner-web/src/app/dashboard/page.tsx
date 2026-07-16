'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  clearAuthSession,
  getAuthSession,
  getStoredApplicationId,
  partnerApi,
  type PartnerApplication,
} from '@/lib/api';
import { PartnerFooter, RegisterHeader, primaryBtnClass } from '@/components/partner-ui';

const STATUS_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under review' },
  { key: 'ACTIVATED', label: 'Activated' },
] as const;

function statusIndex(status: string) {
  if (status === 'REJECTED') return -1;
  if (status === 'ACTIVATED') return 2;
  if (status === 'UNDER_REVIEW') return 1;
  if (status === 'SUBMITTED') return 0;
  return -1;
}

export default function DashboardPage() {
  const [session, setSession] = useState<ReturnType<typeof getAuthSession>>(null);
  const [application, setApplication] = useState<PartnerApplication | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  useEffect(() => {
    const s = getAuthSession();
    setSession(s);
    const appId = getStoredApplicationId();
    if (appId) {
      void partnerApi
        .get(appId)
        .then(setApplication)
        .catch(() => undefined);
    }
    if (s?.accessToken) {
      void partnerApi
        .getTenantMe(s.accessToken)
        .then((t) => {
          setTenantName(t.brandName || t.name);
          setSession((prev) => (prev ? { ...prev, tenantId: t.id } : prev));
        })
        .catch(() => undefined);
    }
  }, []);

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted">
          Sign in or complete partner registration to view your dashboard.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className={primaryBtnClass}>
            Partner login
          </Link>
          <Link
            href="/register/business"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Start Registration
          </Link>
        </div>
      </div>
    );
  }

  const status = application?.status ?? 'UNDER_REVIEW';
  const stepIdx = statusIndex(status);
  const ownerWeb = process.env.NEXT_PUBLIC_OWNER_WEB_URL ?? 'http://localhost:3000';

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader showLogin={false} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Welcome, {session.user.firstName}</h1>
            <p className="mt-2 text-muted">
              {status === 'ACTIVATED'
                ? 'Your venue is activated. Continue in the owner portal to manage courts and bookings.'
                : status === 'REJECTED'
                  ? 'Your application was rejected. Contact support or resubmit with corrected details.'
                  : 'Your venue application is being reviewed. Track progress below.'}
            </p>
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-muted hover:text-foreground"
            onClick={() => {
              clearAuthSession();
              window.location.href = '/login';
            }}
          >
            Sign out
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6">
            <p className="text-sm text-muted">Account</p>
            <p className="mt-1 font-semibold">{session.user.email}</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6">
            <p className="text-sm text-muted">Tenant</p>
            <p className="mt-1 font-semibold">
              {tenantName ?? session.tenantId ?? application?.tenantId ?? 'Provisioning…'}
            </p>
          </div>
        </div>

        <section className="mt-10 rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold">Application tracking</h2>
          <p className="mt-1 text-sm text-muted">
            Status: <strong>{status}</strong>
            {application?.businessName ? ` · ${application.businessName}` : ''}
          </p>
          <ol className="mt-6 space-y-3">
            {STATUS_STEPS.map((step, i) => {
              const done = stepIdx >= i;
              const current = stepIdx === i;
              return (
                <li
                  key={step.key}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                    current ? 'bg-primary/10' : done ? 'bg-emerald-50' : 'bg-surface-high'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-primary text-white' : 'bg-white text-muted'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-semibold">{step.label}</span>
                </li>
              );
            })}
          </ol>
          {status === 'REJECTED' && (
            <p className="mt-4 text-sm text-red-700">
              Application rejected. Start a new registration if you need to re-apply.
            </p>
          )}
        </section>

        {session.generatedPassword && (
          <p className="mt-6 rounded-xl bg-surface-high px-4 py-3 text-sm">
            Temporary password: <strong>{session.generatedPassword}</strong>
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {status === 'ACTIVATED' ? (
            <a href={ownerWeb} className={primaryBtnClass}>
              Open Owner Portal
            </a>
          ) : (
            <Link href="/register/submitted" className={primaryBtnClass}>
              View submission details
            </Link>
          )}
          {!application && (
            <Link
              href="/register/business"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
            >
              Continue registration
            </Link>
          )}
        </div>
      </main>
      <PartnerFooter />
    </div>
  );
}
