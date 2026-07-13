'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import { APP_NAME } from '@fitora/shared';
import { OWNER_NAV } from '@/lib/owner-navigation';
import { clearAuthSession, getStoredUser } from '@/lib/auth';
import { PortalTopBar } from '@/components/portal-top-bar';
import { UserAvatar } from '@/components/user-avatar';

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();

  function logout() {
    clearAuthSession();
    router.push('/login');
  }

  const isActive = (href: string) => {
    if (href === '/owner') return pathname === '/owner';
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
              Court Owner
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {OWNER_NAV.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
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
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4 space-y-3">
        {user && (
          <Link
            href="/account"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-primary-light/50 transition-colors"
          >
            <UserAvatar user={user} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-muted truncate">{user.email}</p>
            </div>
          </Link>
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

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getStoredUser();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 flex flex-col bg-card shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-xl border border-border bg-background p-2 text-muted hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <PortalTopBar
          title="Owner portal"
          subtitle="Manage courts, bookings & revenue"
          browseHref="/"
          browseLabel="Browse Fitora"
          user={user}
          onOpenMenu={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
