'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Ticket,
  IndianRupee,
  Bell,
  LogIn,
  LogOut,
  Store,
  Star,
  Layers,
  Wallet,
  Undo2,
} from 'lucide-react';
import { clearAuthSession, getAuthSession } from '@/lib/api';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/variants', label: 'Variants', icon: Layers },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/settlements', label: 'Settlements', icon: Wallet },
  { href: '/returns', label: 'Returns', icon: Undo2 },
  { href: '/reviews', label: 'Reviews', icon: Star },
  { href: '/coupons', label: 'Coupons', icon: Ticket },
  { href: '/revenue', label: 'Revenue', icon: IndianRupee },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/login', label: 'Login', icon: LogIn },
];

export function ShopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('Shop Partner');
  const [tenantName, setTenantName] = useState('Your shop');

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    const roles = session.user.roles ?? [];
    if (!roles.includes('COURT_OWNER') && !roles.includes('ADMIN')) {
      clearAuthSession();
      router.replace('/login');
      return;
    }
    setUserName(`${session.user.firstName} ${session.user.lastName}`.trim() || session.user.email);
    setTenantName(session.tenantName ?? 'Your shop');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-primary">FitOra Shop</p>
            <p className="text-[11px] uppercase tracking-wide text-muted">Partner Portal</p>
          </div>
        </div>

        <nav className="space-y-1">
          {NAV.filter((item) => item.href !== '/login').map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? 'border-l-4 border-primary-container bg-white text-foreground shadow-sm'
                    : 'text-muted hover:bg-white/70'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted transition hover:bg-white/70"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Link>
          <div className="rounded-2xl bg-primary-container p-4 text-white">
            <p className="text-sm font-semibold">{tenantName}</p>
            <p className="mt-1 text-xs text-white/80">Shop partner workspace</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur">
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">{tenantName}</p>
            <p className="text-xs text-muted">Manage your storefront catalog and fulfilment</p>
          </div>
          <div className="flex items-center gap-3 text-muted">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{userName}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted">Shop Partner</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-border bg-white p-2 text-muted hover:text-error"
              onClick={() => {
                clearAuthSession();
                router.push('/login');
              }}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

export const primaryBtnClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary disabled:opacity-60';

export const secondaryBtnClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-low disabled:opacity-60';
