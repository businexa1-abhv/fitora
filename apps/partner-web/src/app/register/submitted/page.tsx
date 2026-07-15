'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, FileCheck2, Rocket } from 'lucide-react';
import { getAuthSession } from '@/lib/api';
import {
  PartnerFooter,
  RegisterHeader,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/partner-ui';

export default function SubmittedPage() {
  const [session, setSession] = useState<ReturnType<typeof getAuthSession>>(null);

  useEffect(() => {
    setSession(getAuthSession());
  }, []);

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
          Our team is reviewing your application. We’re excited about partnering with your venue to
          redefine the athletic experience.
        </p>

        <div className="mt-10 w-full rounded-3xl border border-border bg-card p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                icon: CheckCircle2,
                label: 'Submitted',
                status: 'Complete',
                tone: 'text-secondary',
              },
              {
                icon: Clock3,
                label: 'Reviewing',
                status: 'In Progress',
                tone: 'text-primary-container',
              },
              { icon: FileCheck2, label: 'Verification', status: 'Upcoming', tone: 'text-muted' },
              { icon: Rocket, label: 'Activation', status: 'Launch', tone: 'text-muted' },
            ].map((step) => (
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

        <div className="mt-12 grid w-full gap-4 text-left sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-surface-low p-6">
            <h2 className="font-semibold">Need help right now?</h2>
            <p className="mt-2 text-sm text-muted">
              Our partner success team is available 24/7 for onboarding questions.
            </p>
            <p className="mt-4 text-sm">support@fitora.com</p>
            <p className="text-sm">+1 (800) FIT-ORA</p>
          </div>
          <div className="rounded-3xl bg-primary-container p-6 text-white">
            <h2 className="font-semibold">Check FAQ</h2>
            <p className="mt-2 text-sm text-white/85">
              Find answers about payouts, venue listing, and membership tiers.
            </p>
            <Link href="/#faq" className={`${secondaryBtnClass} mt-5 border-0`}>
              Visit Help Center
            </Link>
          </div>
        </div>
      </main>
      <PartnerFooter />
    </div>
  );
}
