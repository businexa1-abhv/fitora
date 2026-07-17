'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HelpCircle, LogOut, Menu, Plus, Search, X } from 'lucide-react';
import { PROVIDER_NAV } from '@/lib/provider-navigation';
import { clearAuthSession, getStoredUser } from '@/lib/auth';

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
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/provider" onClick={onNavigate} className="block">
          <p className="font-serif text-xl font-bold leading-none text-[#5a4136]">FitOra Pro</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Service Portal
          </p>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {PROVIDER_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive(item.href)
                  ? 'bg-[#ffdbcc] text-[#a04100]'
                  : 'text-muted hover:bg-background'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-border p-4">
        <Link
          href="/provider/listings"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff6b00] px-3 py-2.5 text-sm font-bold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Listing
        </Link>
        <p className="truncate text-xs text-muted">{user?.email}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-background"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getStoredUser();
  const initials =
    `${user?.firstName?.[0] ?? 'P'}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'P';

  return (
    <div className="flex min-h-screen bg-[#f7f4f0]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-0 flex w-64 flex-col bg-card">
            <button
              className="absolute right-3 top-3 rounded-lg p-1 text-muted"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
          <button className="p-2 -ml-2 lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative hidden min-w-0 flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search orders, clients, or schedules..."
              className="w-full rounded-xl border border-border bg-[#f7f4f0] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#ff6b00]"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs font-semibold text-muted sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              System Status: Active
            </span>
            <button className="rounded-lg p-2 text-muted hover:bg-background" aria-label="Help">
              <HelpCircle className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold leading-none text-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Pro Trainer
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff6b00] text-xs font-bold text-white">
                {initials}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
