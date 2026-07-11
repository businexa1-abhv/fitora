'use client';

import { useEffect, useState } from 'react';
import type { NotificationItem } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';
import { formatDate } from '@/lib/trainer-utils';

export default function TrainerNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    const data = await listNotifications(token);
    setItems(data.items);
  }

  useEffect(() => {
    load()
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleRead(id: string) {
    const token = getAccessToken();
    if (!token) return;
    await markNotificationRead(token, id);
    await load();
  }

  async function handleReadAll() {
    const token = getAccessToken();
    if (!token) return;
    await markAllNotificationsRead(token);
    await load();
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Notifications"
        description="Enrollments, leave updates, and training alerts"
        actions={
          items.some((n) => !n.readAt) ? (
            <button onClick={handleReadAll} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              Mark all read
            </button>
          ) : undefined
        }
      />

      {loading && <div className="h-32 rounded-2xl skeleton" />}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {items.length === 0 && !loading && (
            <p className="px-6 py-12 text-sm text-muted text-center">No notifications yet</p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.readAt && handleRead(n.id)}
              className={`w-full text-left px-6 py-4 transition-colors hover:bg-background ${
                !n.readAt ? 'bg-primary-light/20' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{n.title}</p>
                  <p className="text-sm text-muted mt-1">{n.body}</p>
                </div>
                {!n.readAt && (
                  <span className="shrink-0 h-2 w-2 rounded-full bg-primary mt-2" />
                )}
              </div>
              <p className="text-xs text-muted mt-2">{formatDate(n.createdAt)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
