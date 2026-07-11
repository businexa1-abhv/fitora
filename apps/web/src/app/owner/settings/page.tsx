'use client';

import { useState } from 'react';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { FormField, inputClassName, buttonClassName } from '@/components/auth-layout';
import { getStoredUser } from '@/lib/auth';

export default function OwnerSettingsPage() {
  const user = getStoredUser();
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-2xl">
      <OwnerPageHeader
        title="Settings"
        description="Manage your court owner account and preferences"
      />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h2 className="font-bold">Business profile</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First name" id="firstName">
              <input id="firstName" className={inputClassName} defaultValue={user?.firstName} />
            </FormField>
            <FormField label="Last name" id="lastName">
              <input id="lastName" className={inputClassName} defaultValue={user?.lastName} />
            </FormField>
          </div>

          <FormField label="Email" id="email">
            <input id="email" type="email" className={inputClassName} defaultValue={user?.email} disabled />
          </FormField>

          <FormField label="Business name" id="business">
            <input id="business" className={inputClassName} placeholder="Your sports business name" />
          </FormField>

          <FormField label="Payout UPI / Bank" id="payout">
            <input id="payout" className={inputClassName} placeholder="UPI ID or account number" />
          </FormField>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h2 className="font-bold">Notifications</h2>

          {[
            { label: 'New booking alerts', desc: 'Email when a player books a slot' },
            { label: 'Payment confirmations', desc: 'Notify on successful payments' },
            { label: 'Membership renewals', desc: 'Alert when memberships are expiring' },
          ].map((item) => (
            <label key={item.label} className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5 rounded accent-primary" />
            </label>
          ))}
        </div>

        {saved && (
          <div className="rounded-xl bg-primary-light border border-primary/20 px-4 py-3 text-sm text-primary font-medium">
            Settings saved successfully
          </div>
        )}

        <button type="submit" className={buttonClassName}>
          Save settings
        </button>
      </form>
    </div>
  );
}
