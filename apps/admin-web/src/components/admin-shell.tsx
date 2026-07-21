'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  LifeBuoy,
  FilePenLine,
  LogOut,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Zap,
  Receipt,
  Percent,
  Activity,
  MapPin,
} from 'lucide-react';
import { clearAuthSession, getAuthSession } from '@/lib/api';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/owners', label: 'Management', icon: Users },
  { href: '/courts', label: 'Courts', icon: MapPin },
  { href: '/occupancy', label: 'Live Occupancy', icon: Activity },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/settlements', label: 'Settlements', icon: Receipt },
  { href: '/gst', label: 'GST', icon: Percent },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/cms', label: 'CMS', icon: FilePenLine },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('Super Admin');

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!session.user.roles.includes('ADMIN')) {
      clearAuthSession();
      router.replace('/login');
      return;
    }
    setUserName(`${session.user.firstName} ${session.user.lastName}`.trim() || 'Super Admin');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container text-white">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-primary">FitOra Admin</p>
            <p className="text-[11px] uppercase tracking-wide text-muted">Enterprise Admin</p>
          </div>
        </div>

        <nav className="space-y-1">
          {NAV.map((item) => {
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

        <div className="mt-auto rounded-2xl bg-primary-container p-4 text-white">
          <p className="text-sm font-semibold">Daily Summary Ready</p>
          <button
            type="button"
            className="mt-3 w-full rounded-full bg-white px-3 py-2 text-sm font-semibold text-primary"
          >
            Export Report
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-full border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-container"
              placeholder="Search platform metrics..."
            />
          </div>
          <div className="ml-auto flex items-center gap-3 text-muted">
            <Bell className="h-5 w-5" />
            <Settings className="h-5 w-5" />
            <HelpCircle className="h-5 w-5" />
            <div className="ml-2 text-right">
              <p className="text-sm font-semibold text-foreground">{userName}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted">Super Admin</p>
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
