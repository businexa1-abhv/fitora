'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthSession } from '@/lib/api';
import { PartnerFooter, RegisterHeader, primaryBtnClass } from '@/components/partner-ui';

export default function DashboardPage() {
  const [session, setSession] = useState<ReturnType<typeof getAuthSession>>(null);

  useEffect(() => {
    setSession(getAuthSession());
  }, []);

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted">
          Sign in or complete partner registration to view your dashboard.
        </p>
        <Link href="/register/business" className={primaryBtnClass}>
          Start Registration
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader showLogin={false} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Welcome, {session.user.firstName}</h1>
        <p className="mt-2 text-muted">
          Your venue application is under review. You can continue preparing courts while our team
          verifies your documents.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6">
            <p className="text-sm text-muted">Account</p>
            <p className="mt-1 font-semibold">{session.user.email}</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6">
            <p className="text-sm text-muted">Tenant</p>
            <p className="mt-1 font-semibold">{session.tenantId ?? 'Provisioning…'}</p>
          </div>
        </div>
        {session.generatedPassword && (
          <p className="mt-6 rounded-xl bg-surface-high px-4 py-3 text-sm">
            Temporary password: <strong>{session.generatedPassword}</strong>
          </p>
        )}
        <Link href="/register/submitted" className={`${primaryBtnClass} mt-8`}>
          View Application Status
        </Link>
      </main>
      <PartnerFooter />
    </div>
  );
}
