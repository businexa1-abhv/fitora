'use client';

import Link from 'next/link';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';

export default function ProviderSettingsPage() {
  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Settings"
        description="Profile, notifications, and business preferences"
      />
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted">
          Provider settings will expand here. Notification prefs are available now.
        </p>
        <Link
          href="/provider/notifications"
          className="mt-4 inline-flex rounded-xl bg-[#ff6b00] px-4 py-2 text-sm font-bold text-white"
        >
          Notification settings
        </Link>
      </div>
    </div>
  );
}
