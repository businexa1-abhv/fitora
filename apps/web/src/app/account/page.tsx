'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, ChevronRight, CreditCard, Settings, Shield } from 'lucide-react';
import { ROLE_LABELS, UserRole, type AuthUser } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';
import { UserAvatar } from '@/components/user-avatar';
import { FadeUp } from '@/components/motion';
import { getAccessToken, getStoredUser, updateStoredUser } from '@/lib/auth';
import { getMe } from '@/lib/api';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();
    if (!token || !stored) {
      router.replace('/login');
      return;
    }
    setUser(stored);
    setLoading(false);

    getMe(token)
      .then((fresh) => {
        const next: AuthUser = {
          id: fresh.id,
          email: fresh.email,
          firstName: fresh.firstName,
          lastName: fresh.lastName,
          roles: fresh.roles,
          phone: fresh.phone,
          avatarUrl: fresh.avatarUrl,
          emailVerified: fresh.emailVerified,
          phoneVerified: fresh.phoneVerified,
        };
        updateStoredUser(next);
        setUser(next);
      })
      .catch(() => undefined);
  }, [router]);

  if (loading || !user) {
    return (
      <PageShell>
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <div className="h-40 rounded-2xl skeleton" />
        </main>
      </PageShell>
    );
  }

  const primaryRole = user.roles[0] ?? UserRole.PLAYER;

  const fields = [
    { label: 'Full name', value: `${user.firstName} ${user.lastName}` },
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone || 'Not set' },
    { label: 'Role', value: user.roles.map((r) => ROLE_LABELS[r]).join(', ') },
    {
      label: 'Email verified',
      value: user.emailVerified ? 'Verified' : 'Not verified',
    },
  ];

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <FadeUp>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">Account</p>
          <h1 className="text-3xl font-extrabold mt-1">Profile details</h1>
          <p className="text-muted text-sm mt-2">Your personal information on Fitora</p>
        </FadeUp>

        <FadeUp delay={0.08}>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-4">
              <UserAvatar user={user} size="lg" />
              <div>
                <h2 className="text-xl font-bold">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-sm text-muted">{user.email}</p>
                <span className="mt-2 inline-flex rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {ROLE_LABELS[primaryRole]}
                </span>
              </div>
            </div>

            <dl className="mt-8 divide-y divide-border">
              {fields.map((field) => (
                <div key={field.label} className="flex items-start justify-between gap-4 py-3.5">
                  <dt className="text-sm text-muted">{field.label}</dt>
                  <dd className="text-sm font-semibold text-right">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </FadeUp>

        <FadeUp delay={0.14}>
          <div className="mt-4 space-y-2">
            <Link
              href="/settings"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary hover:bg-primary-light/30 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Settings className="h-4 w-4 text-primary" />
                Account settings
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              href="/notifications/settings"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary hover:bg-primary-light/30 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Bell className="h-4 w-4 text-primary" />
                Notification preferences
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              href="/payments"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary hover:bg-primary-light/30 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment history
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary hover:bg-primary-light/30 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Shield className="h-4 w-4 text-primary" />
                Dashboard
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          </div>
        </FadeUp>
      </main>
    </PageShell>
  );
}
