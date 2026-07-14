'use client';

import React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import { APP_NAME } from '@fitora/shared';
import { PROVIDER_NAV } from '@/lib/provider-navigation';
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
    if (href === '/provider') return pathname === '/provider';
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
              Provider Portal
            </p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {PROVIDER_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive(item.href)
                  ? 'bg-primary-light text-primary'
                  : 'text-muted hover:bg-background'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
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

export function ProviderShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getStoredUser();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card shrink-0">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card flex flex-col shadow-2xl">
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

      <div className="flex-1 flex flex-col min-w-0">
        <PortalTopBar
          title="Provider portal"
          subtitle="Listings, orders & marketplace"
          browseHref="/services"
          browseLabel="View marketplace"
          user={user}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
