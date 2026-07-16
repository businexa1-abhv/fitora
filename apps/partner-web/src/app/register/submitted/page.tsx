'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, FileCheck2, Rocket } from 'lucide-react';
import {
  getAuthSession,
  getStoredApplicationId,
  partnerApi,
  type PartnerApplication,
} from '@/lib/api';
import {
  PartnerFooter,
  RegisterHeader,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/partner-ui';

export default function SubmittedPage() {
  const [session, setSession] = useState<ReturnType<typeof getAuthSession>>(null);
  const [application, setApplication] = useState<PartnerApplication | null>(null);

  useEffect(() => {
    setSession(getAuthSession());
    const id = getStoredApplicationId();
    if (!id) return;
    void partnerApi
      .get(id)
      .then(setApplication)
      .catch(() => undefined);
  }, []);

  const status = application?.status ?? 'SUBMITTED';
  const steps = [
    {
      icon: CheckCircle2,
      label: 'Submitted',
      status: 'Complete',
      tone: 'text-secondary',
      active: true,
    },
    {
      icon: Clock3,
      label: 'Reviewing',
      status:
        status === 'UNDER_REVIEW' || status === 'ACTIVATED'
          ? status === 'UNDER_REVIEW'
            ? 'In Progress'
            : 'Complete'
          : 'Upcoming',
      tone:
        status === 'UNDER_REVIEW' || status === 'ACTIVATED'
          ? 'text-primary-container'
          : 'text-muted',
      active: status === 'UNDER_REVIEW' || status === 'ACTIVATED' || status === 'SUBMITTED',
    },
    {
      icon: FileCheck2,
      label: 'Verification',
      status:
        status === 'ACTIVATED'
          ? 'Complete'
          : status === 'UNDER_REVIEW'
            ? 'In Progress'
            : 'Upcoming',
      tone:
        status === 'ACTIVATED' || status === 'UNDER_REVIEW'
          ? 'text-primary-container'
          : 'text-muted',
      active: status === 'UNDER_REVIEW' || status === 'ACTIVATED',
    },
    {
      icon: Rocket,
      label: 'Activation',
      status: status === 'ACTIVATED' ? 'Live' : status === 'REJECTED' ? 'Rejected' : 'Launch',
      tone:
        status === 'ACTIVATED'
          ? 'text-secondary'
          : status === 'REJECTED'
            ? 'text-red-600'
            : 'text-muted',
      active: status === 'ACTIVATED' || status === 'REJECTED',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader showLogin={false} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-4 py-16 text-center sm:px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-secondary shadow-[0_0_0_12px_rgba(0,108,74,0.08)]">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-8 font-display text-4xl font-bold text-foreground">
          Thank You for Joining Us
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Current status: <strong>{status}</strong>
          {application?.businessName ? ` · ${application.businessName}` : ''}. We’ll email you as
          verification progresses.
        </p>

        <div className="mt-10 w-full rounded-3xl border border-border bg-card p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {steps.map((step) => (
              <div key={step.label} className="text-center">
                <step.icon className={`mx-auto h-7 w-7 ${step.tone}`} />
                <p className="mt-2 text-sm font-semibold">{step.label}</p>
                <p className={`text-xs ${step.tone}`}>{step.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <span className="rounded-full bg-surface-low px-4 py-2 text-muted">
            Expected TAT: <strong className="text-foreground">24-48 hours</strong>
          </span>
          <span className="rounded-full bg-surface-low px-4 py-2 text-muted">
            We’ll email you the status updates
          </span>
        </div>

        {session?.generatedPassword && (
          <p className="mt-4 rounded-xl bg-surface-high px-4 py-3 text-sm text-foreground">
            Your partner login password: <strong>{session.generatedPassword}</strong>
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className={primaryBtnClass}>
            Go to Dashboard
          </Link>
          <button type="button" onClick={() => window.print()} className={secondaryBtnClass}>
            Print Receipt
          </button>
        </div>
      </main>
      <PartnerFooter />
    </div>
  );
}
