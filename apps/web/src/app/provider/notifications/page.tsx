'use client';

import React from 'react';

import { useEffect, useState } from 'react';
import type { NotificationItem } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/notifications';

export default function ProviderNotificationsPage(): React.JSX.Element {
  const [items, setItems] = useState<NotificationItem[]>([]);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setItems((await listNotifications(token)).items);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Notifications"
        description="Booking updates and customer ratings"
        actions={
          items.some((n) => !n.readAt) ? (
            <button
              onClick={async () => {
                const t = getAccessToken();
                if (t) { await markAllNotificationsRead(t); await load(); }
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
            >
              Mark all read
            </button>
          ) : undefined
        }
      />
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={async () => {
              const t = getAccessToken();
              if (t && !n.readAt) { await markNotificationRead(t, n.id); await load(); }
            }}
            className={`w-full text-left px-6 py-4 ${!n.readAt ? 'bg-primary-light/20' : ''}`}
          >
            <p className="font-semibold text-sm">{n.title}</p>
            <p className="text-sm text-muted mt-1">{n.body}</p>
          </button>
        ))}
        {items.length === 0 && <p className="px-6 py-12 text-center text-sm text-muted">No notifications</p>}
      </div>
    </div>
  );
}
