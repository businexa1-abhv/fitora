'use client';

import React from 'react';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { clearAuthSession, getValidAccessToken } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/notifications';

export function NotificationBell({ light = false }: { light?: boolean }): React.JSX.Element {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let polling = true;

    async function loadUnreadCount() {
      const token = getValidAccessToken();
      if (!token) {
        setCount(0);
        polling = false;
        return;
      }

      try {
        const result = await getUnreadNotificationCount(token);
        setCount(result.count);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAuthSession();
          polling = false;
        }
        setCount(0);
      }
    }

    void loadUnreadCount();
    const interval = setInterval(() => {
      if (!polling) {
        clearInterval(interval);
        return;
      }
      void loadUnreadCount();
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
