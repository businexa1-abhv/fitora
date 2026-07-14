'use client';

import React from 'react';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NotificationPreferences } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';
import { getAccessToken } from '@/lib/auth';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/notifications';

export default function NotificationSettingsPage(): React.JSX.Element {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getNotificationPreferences(token)
      .then(setPrefs)
      .catch(() => setPrefs(null));
  }, [router]);

  async function toggle(key: keyof NotificationPreferences) {
    if (!prefs || key === 'typeOverrides') return;
    const token = getAccessToken();
    if (!token) return;

    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      const saved = await updateNotificationPreferences(token, { [key]: updated[key] });
      setPrefs(saved);
      setMessage('Preferences saved');
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const channels = [
    { key: 'inAppEnabled' as const, label: 'In-app notifications', desc: 'Notification center & badges' },
    { key: 'emailEnabled' as const, label: 'Email', desc: 'Booking confirmations, receipts, reminders' },
    { key: 'smsEnabled' as const, label: 'SMS', desc: 'Booking reminders & urgent alerts' },
    { key: 'pushEnabled' as const, label: 'Push notifications', desc: 'Mobile alerts via FCM / Expo' },
  ];

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <Link href="/notifications" className="text-sm text-primary font-semibold">
          ← Back to notifications
        </Link>
        <h1 className="text-2xl font-extrabold mt-4">Notification preferences</h1>
        <p className="text-sm text-muted mt-1">Choose how you receive alerts</p>

        {!prefs && <div className="h-32 rounded-2xl skeleton mt-8" />}

        {prefs && (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border shadow-sm mt-8">
            {channels.map((ch) => (
              <label
                key={ch.key}
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-background/50"
              >
                <div>
                  <p className="font-semibold text-sm">{ch.label}</p>
                  <p className="text-xs text-muted mt-0.5">{ch.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs[ch.key]}
                  disabled={saving}
                  onChange={() => toggle(ch.key)}
                  className="h-5 w-5 accent-primary"
                />
              </label>
            ))}
          </div>
        )}

        {message && <p className="text-sm text-muted mt-4">{message}</p>}
      </main>
    </PageShell>
  );
}
