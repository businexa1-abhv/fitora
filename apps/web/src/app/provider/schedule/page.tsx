'use client';

import Link from 'next/link';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';

export default function ProviderSchedulePage() {
  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Schedule"
        description="Plan service windows and on-site appointments"
      />
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted">
          Schedule management is coming soon. Track urgent jobs from the dashboard for now.
        </p>
        <Link
          href="/provider"
          className="mt-4 inline-flex rounded-xl bg-[#ff6b00] px-4 py-2 text-sm font-bold text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
