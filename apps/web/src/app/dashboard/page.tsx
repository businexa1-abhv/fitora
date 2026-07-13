'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ROLE_LABELS, UserRole, type AuthUser } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { FadeUp } from '@/components/motion';
import { getAccessToken, getStoredUser } from '@/lib/auth';

const ROLE_ACTIONS: Record<UserRole, { title: string; items: string[] }> = {
  [UserRole.PLAYER]: {
    title: 'Player',
    items: ['Browse and book courts', 'Buy memberships', 'Enroll kids in training', 'Shop gear'],
  },
  [UserRole.COURT_OWNER]: {
    title: 'Court Owner',
    items: [
      'Manage your courts',
      'Configure slots and pricing',
      'Create membership plans',
      'View bookings',
    ],
  },
  [UserRole.TRAINER]: {
    title: 'Trainer',
    items: ['View assigned batches', 'Mark attendance', 'Track kid progress', 'Manage schedules'],
  },
  [UserRole.SERVICE_PROVIDER]: {
    title: 'Service Provider',
    items: ['List sports services', 'Accept service requests', 'Update job status'],
  },
  [UserRole.PRINTER]: {
    title: 'Printer',
    items: ['View print orders', 'Upload proofs', 'Update fulfillment status'],
  },
  [UserRole.ADMIN]: {
    title: 'Admin',
    items: ['Monitor platform activity', 'Manage users and courts', 'Oversee e-commerce'],
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();
    if (!token || !storedUser) {
      router.replace('/login');
      return;
    }
    setUser(storedUser);
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  const primaryRole = user.roles[0] ?? UserRole.PLAYER;
  const actions = ROLE_ACTIONS[primaryRole];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="hero-mesh text-white py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-white/70 text-sm">Welcome back</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">Hello, {user.firstName} 👋</h1>
            <p className="text-white/75 mt-2">
              {ROLE_LABELS[primaryRole]} · {user.email}
            </p>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="grid gap-4 sm:grid-cols-3 mb-8 -mt-10">
          {['Bookings', 'Memberships', 'Training'].map((label, i) => (
            <FadeUp key={label} delay={i * 0.1}>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm card-hover">
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-1 text-2xl font-extrabold text-primary">—</p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.2}>
          <div className="rounded-2xl border border-border bg-card p-6 mb-8">
            <h2 className="text-lg font-bold">{actions.title} quick actions</h2>
            <ul className="mt-4 grid sm:grid-cols-2 gap-2">
              {actions.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted p-2 rounded-lg hover:bg-primary-light hover:text-primary transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>

        <div className="flex flex-wrap gap-3">
          {(user.roles.includes(UserRole.PLAYER) || user.roles.includes(UserRole.COURT_OWNER)) && (
            <>
              <Link
                href="/courts"
                className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Browse courts
              </Link>
              <Link
                href="/bookings"
                className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-card"
              >
                My bookings
              </Link>
              <Link
                href="/memberships"
                className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-card"
              >
                Memberships
              </Link>
              <Link
                href="/training"
                className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-card"
              >
                Kids training
              </Link>
              <Link
                href="/shop"
                className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-card"
              >
                Sports shop
              </Link>
            </>
          )}
          {user.roles.includes(UserRole.COURT_OWNER) && (
            <Link
              href="/owner"
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Owner dashboard
            </Link>
          )}
          {user.roles.includes(UserRole.TRAINER) && (
            <Link
              href="/trainer"
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Trainer dashboard
            </Link>
          )}
          {(user.roles.includes(UserRole.SERVICE_PROVIDER) ||
            user.roles.includes(UserRole.PRINTER)) && (
            <Link
              href="/provider"
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {user.roles.includes(UserRole.PRINTER) ? 'Printer dashboard' : 'Provider dashboard'}
            </Link>
          )}
          {(user.roles.includes(UserRole.PLAYER) || user.roles.includes(UserRole.COURT_OWNER)) && (
            <>
              <Link
                href="/services"
                className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-card"
              >
                Sports services
              </Link>
              <Link
                href="/payments"
                className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-card"
              >
                Payment history
              </Link>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
