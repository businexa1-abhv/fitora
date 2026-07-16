'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShopShell } from '@/components/shop-shell';
import { getAccessToken, shopPartnerApi, type NotificationItem } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      shopPartnerApi.listNotifications(token),
      shopPartnerApi.unreadNotificationCount(token),
    ])
      .then(([list, count]) => {
        setNotifications(list.items);
        setUnread(count.count);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ShopShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Order and shop alerts for your account.</p>
        </div>
        {unread > 0 && (
          <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-white">
            {unread} unread
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {loading && <li className="text-sm text-muted">Loading notifications…</li>}
        {!loading && notifications.length === 0 && (
          <li className="rounded-2xl bg-surface-low px-4 py-6 text-sm text-muted">
            No notifications yet.
          </li>
        )}
        {notifications.map((item) => (
          <li
            key={item.id}
            className={`rounded-2xl border px-4 py-4 ${
              item.readAt
                ? 'border-border bg-card'
                : 'border-primary-container/30 bg-primary-container/5'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
              </div>
              <span className="text-xs text-muted">{formatDate(item.createdAt)}</span>
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">{item.type}</p>
          </li>
        ))}
      </ul>
    </ShopShell>
  );
}
