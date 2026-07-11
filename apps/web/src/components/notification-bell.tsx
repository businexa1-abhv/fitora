'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getAccessToken } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/notifications';

export function NotificationBell({ light = false }: { light?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getUnreadNotificationCount(token)
      .then((r) => setCount(r.count))
      .catch(() => setCount(0));
    const interval = setInterval(() => {
      getUnreadNotificationCount(token).then((r) => setCount(r.count)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/notifications"
      className={`relative rounded-xl p-2 transition-colors ${
        light ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-muted hover:text-primary hover:bg-primary-light/50'
      }`}
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
