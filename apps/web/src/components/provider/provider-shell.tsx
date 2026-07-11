'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { APP_NAME } from '@fitora/shared';
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
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">F</span>
          <div>
            <p className="font-bold leading-none text-sm">{APP_NAME}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mt-0.5">Provider Portal</p>
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
                isActive(item.href) ? 'bg-primary-light text-primary' : 'text-muted hover:bg-background'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted mb-2 truncate">{user?.email}</p>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-background">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card shrink-0">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card flex flex-col">
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 border-b border-border bg-card px-4 h-14">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-sm">Provider Portal</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Link href="/services" className="text-sm text-muted hover:text-primary mb-6 inline-block">View marketplace →</Link>
          {children}
        </main>
      </div>
    </div>
  );
}
