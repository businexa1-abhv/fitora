'use client';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ROLE_LABELS, UserRole, type AuthUser } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { FadeUp } from '@/components/motion';
import { getAccessToken, getStoredUser } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠', active: true },
  { href: '/bookings', label: 'My Bookings', icon: '📅', active: false },
  { href: '/memberships', label: 'Memberships', icon: '💳', active: false },
  { href: '/training', label: 'Kids Profiles', icon: '👶', active: false },
  { href: '/shop', label: 'My Orders', icon: '📦', active: false },
  { href: '/courts', label: 'Explore', icon: '🔍', active: false },
  { href: '/settings', label: 'Settings', icon: '⚙️', active: false },
];

const QUICK_ACTIONS = [
  { icon: '🏸', label: 'Book Court', href: '/courts', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  { icon: '📅', label: 'My Games', href: '/bookings', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
  { icon: '👶', label: 'Kids Programs', href: '/training', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
  { icon: '📦', label: 'My Orders', href: '/shop', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
];

const FRIENDS_MOCK = [
  { initials: 'RK', name: 'Rahul', activity: 'played Badminton at Smash Arena', time: '2h ago', color: '#059669' },
  { initials: 'PS', name: 'Priya', activity: 'enrolled in KPHB Academy', time: '5h ago', color: '#2563EB' },
  { initials: 'AV', name: 'Arun', activity: 'booked Football at Greenfield FC', time: 'Yesterday', color: '#D97706' },
];

export default function DashboardPage(): React.JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();
    if (!token || !storedUser) { router.replace('/login'); return; }
    setUser(storedUser);
  }, [router]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted text-sm">Loading…</p></div>;
  }

  const primaryRole = user.roles[0] ?? UserRole.PLAYER;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex">
        {/* ── Left Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-card">
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                {user.firstName[0]}{user.lastName?.[0] ?? ''}
              </div>
              <div>
                <p className="font-bold text-sm">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted">{ROLE_LABELS[primaryRole]}</p>
              </div>
            </div>
          </div>
          <nav className="p-3 flex-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all ${
                  item.active
                    ? 'bg-primary-light text-primary font-bold'
                    : 'text-foreground hover:bg-background hover:text-primary'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          {user.roles.includes(UserRole.COURT_OWNER) && (
            <div className="p-3 border-t border-border">
              <Link href="/owner" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-primary-light transition-all">
                🏟️ Owner Dashboard
              </Link>
            </div>
          )}
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0 overflow-auto">
          {/* Greeting bar */}
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {greeting}, {user.firstName} 👋
                </h1>
                <p className="text-sm text-muted mt-0.5">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/notifications" className="p-2 rounded-xl border border-border hover:bg-card transition-all">
                  🔔
                </Link>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { value: '47', label: 'Courts Booked', icon: '🏸', color: 'bg-orange-50 text-orange-600' },
                { value: '3', label: 'Active Memberships', icon: '💳', color: 'bg-green-50 text-green-600' },
                { value: '₹12,400', label: 'Total Spent', icon: '💰', color: 'bg-blue-50 text-blue-600' },
                { value: '8', label: 'Upcoming Sessions', icon: '📅', color: 'bg-amber-50 text-amber-600' },
              ].map((stat, i) => (
                <FadeUp key={stat.label} delay={i * 0.08}>
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted mt-1 font-medium">{stat.label}</p>
                  </div>
                </FadeUp>
              ))}
            </div>

            {/* Quick actions */}
            <FadeUp delay={0.15}>
              <div className="rounded-2xl border border-border bg-card p-5 mb-6">
                <h2 className="font-bold text-base mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl font-semibold text-sm transition-all ${action.color}`}
                    >
                      <span className="text-2xl">{action.icon}</span>
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>
            </FadeUp>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Upcoming bookings */}
              <FadeUp delay={0.2} className="lg:col-span-2">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold">Upcoming Bookings</h2>
                    <Link href="/bookings" className="text-sm text-primary font-semibold hover:underline">View all</Link>
                  </div>
                  <div className="space-y-3">
                    {[
                      { venue: 'Smash Arena', court: 'Court 2', sport: '🏸', date: 'Today', time: '6:00 PM', status: 'soon', countdown: 'In 2h' },
                      { venue: 'KPHB Badminton', court: 'Court 1', sport: '🏸', date: 'Tomorrow', time: '7:00 AM', status: 'upcoming', countdown: '' },
                      { venue: 'Greenfield FC', court: 'Ground A', sport: '⚽', date: 'Sat 19 Jul', time: '5:00 PM', status: 'upcoming', countdown: '' },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-background transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl shrink-0">
                          {b.sport}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{b.venue}</p>
                          <p className="text-xs text-muted">{b.court} · {b.date} · {b.time}</p>
                        </div>
                        {b.status === 'soon' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{b.countdown}</span>
                            <Link href="/bookings" className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors">
                              Get QR
                            </Link>
                          </div>
                        ) : (
                          <Link href="/bookings" className="border border-border text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-card transition-colors">
                            Details
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* Friends activity */}
              <FadeUp delay={0.25}>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold">Friends Activity</h2>
                  </div>
                  <div className="space-y-4">
                    {FRIENDS_MOCK.map((f) => (
                      <div key={f.name} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: f.color }}>
                          {f.initials}
                        </div>
                        <div>
                          <p className="text-sm text-foreground">
                            <span className="font-bold">{f.name}</span> {f.activity}
                          </p>
                          <p className="text-xs text-muted mt-0.5">{f.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/courts" className="mt-4 block text-center text-sm text-primary font-semibold hover:underline">
                    View Community →
                  </Link>
                </div>
              </FadeUp>
            </div>

            {/* Active memberships */}
            <FadeUp delay={0.3} className="mt-6">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">Active Memberships</h2>
                  <Link href="/memberships" className="text-sm text-primary font-semibold hover:underline">Manage</Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { sport: '🏸', name: 'Gold Badminton Pass', plan: 'Monthly', valid: 'Dec 2026', used: 14, total: 20 },
                    { sport: '⚽', name: 'Football Weekend', plan: 'Quarterly', valid: 'Mar 2027', used: 5, total: 12 },
                  ].map((m, i) => (
                    <div key={i} className="rounded-xl border border-border p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{m.sport}</span>
                        <div>
                          <p className="font-bold text-sm">{m.name}</p>
                          <p className="text-xs text-muted">{m.plan} · Valid till {m.valid}</p>
                        </div>
                      </div>
                      <div className="w-full bg-border rounded-full h-1.5 mb-1">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(m.used / m.total) * 100}%` }} />
                      </div>
                      <p className="text-xs text-muted">{m.used} of {m.total} sessions used</p>
                    </div>
                  ))}
                  <Link href="/memberships" className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary transition-all">
                    <span className="text-2xl">+</span>
                    <span className="text-sm font-semibold">Add Membership</span>
                  </Link>
                </div>
              </div>
            </FadeUp>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

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
