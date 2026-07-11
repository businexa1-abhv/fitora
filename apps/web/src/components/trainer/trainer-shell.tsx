'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { APP_NAME } from '@fitora/shared';
import { TRAINER_NAV } from '@/lib/trainer-navigation';
import { clearAuthSession, getAccessToken, getStoredUser } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/notifications';

function NavContent({
  onNavigate,
  unreadCount,
}: {
  onNavigate?: () => void;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();

  function logout() {
    clearAuthSession();
    router.push('/login');
  }

  const isActive = (href: string) => {
    if (href === '/trainer') return pathname === '/trainer';
    return pathname.startsWith(href);
  };

  return (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
            F
          </span>
          <div>
            <p className="font-bold leading-none text-sm">{APP_NAME}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mt-0.5">
              Trainer Portal
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {TRAINER_NAV.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const showBadge = item.href === '/trainer/notifications' && unreadCount > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? 'bg-primary-light text-primary shadow-sm'
                        : 'text-muted hover:bg-background hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {showBadge && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        {user && (
          <p className="px-2 text-xs text-muted truncate mb-3">
            {user.firstName} {user.lastName}
          </p>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

export function TrainerShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getUnreadNotificationCount(token)
      .then((r) => setUnreadCount(r.count))
      .catch(() => setUnreadCount(0));
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <NavContent unreadCount={unreadCount} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 flex flex-col bg-card shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:bg-background"
            >
              <X className="h-5 w-5" />
            </button>
            <NavContent onNavigate={() => setMobileOpen(false)} unreadCount={unreadCount} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-card/95 backdrop-blur px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-background lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="text-sm text-muted hover:text-primary transition-colors lg:hidden">
            ← Back to app
          </Link>
          <div className="hidden lg:block ml-auto">
            <Link href="/" className="text-sm text-muted hover:text-primary transition-colors">
              View consumer app →
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
