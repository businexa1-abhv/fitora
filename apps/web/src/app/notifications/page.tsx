'use client';

import React from 'react';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NOTIFICATION_TYPE_LABELS, type NotificationItem } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';
import { getAccessToken } from '@/lib/auth';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/notifications';

export default function NotificationsPage(): React.JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setItems((await listNotifications(token)).items);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    load().catch(() => setItems([])).finally(() => setLoading(false));
  }, [router]);

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold">Notification center</h1>
            <p className="text-sm text-muted mt-1">Bookings, orders, payments & reminders</p>
          </div>
          {items.some((n) => !n.readAt) && (
            <button
              onClick={async () => {
                const t = getAccessToken();
                if (t) { await markAllNotificationsRead(t); await load(); }
              }}
              className="text-sm text-primary font-semibold"
            >
              Mark all read
            </button>
          )}
        </div>

        {loading && <div className="h-32 rounded-2xl skeleton" />}

        <div className="rounded-2xl border border-border bg-card divide-y divide-border shadow-sm">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                const t = getAccessToken();
                if (t && !n.readAt) { await markNotificationRead(t, n.id); await load(); }
              }}
              className={`w-full text-left px-6 py-4 hover:bg-background/50 transition-colors ${!n.readAt ? 'bg-primary-light/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase">
                    {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                  </p>
                  <p className="font-semibold text-sm mt-0.5">{n.title}</p>
                  <p className="text-sm text-muted mt-1">{n.body}</p>
                </div>
                {!n.readAt && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
              </div>
              <p className="text-xs text-muted mt-2">{new Date(n.createdAt).toLocaleString()}</p>
            </button>
          ))}
          {!loading && items.length === 0 && (
            <p className="px-6 py-16 text-center text-sm text-muted">No notifications yet</p>
          )}
        </div>

        <p className="text-xs text-muted mt-6 text-center">
          Push, email & SMS delivered when configured.{' '}
          <Link href="/notifications/settings" className="text-primary hover:underline">
            Notification settings
          </Link>
        </p>
      </main>
    </PageShell>
  );
}
