'use client';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DURATION_LABELS, type Membership } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatDate, formatPrice } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { getAccessToken } from '@/lib/auth';
import { getMyMemberships } from '@/lib/courts';

export default function MembershipsPage(): React.JSX.Element {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getMyMemberships(token)
      .then(setMemberships)
      .catch(() => setMemberships([]))
      .finally(() => setLoading(false));
  }, [router]);

  const activeCount = memberships.filter((m) => m.isActive).length;

  return (
    <PageShell>
      <Navbar />

      <section className="hero-mesh text-white py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-1">
              Member perks
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold">My memberships</h1>
            <p className="text-white/75 mt-2">
              {activeCount > 0
                ? `${activeCount} active plan${activeCount === 1 ? '' : 's'} · 10% booking discount`
                : 'Save 10% on every booking with a membership'}
            </p>
            <Link
              href="/courts"
              className="inline-flex mt-5 rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              Browse courts →
            </Link>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 -mt-4">
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl skeleton" />
            ))}
          </div>
        )}

        {!loading && memberships.length === 0 && (
          <FadeUp>
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
              <span className="text-4xl">🎫</span>
              <p className="text-lg font-semibold mt-4">No active memberships</p>
              <p className="text-muted text-sm mt-1 mb-6">
                Purchase a plan at your favourite court to unlock discounts
              </p>
              <Link
                href="/courts"
                className="inline-flex rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors"
              >
                Find courts with plans
              </Link>
            </div>
          </FadeUp>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {memberships.map((m, i) => (
            <FadeUp key={m.id} delay={i * 0.08}>
              <div
                className={`card-hover rounded-2xl border overflow-hidden shadow-sm ${
                  m.isActive ? 'border-primary/30 bg-card' : 'border-border bg-card opacity-80'
                }`}
              >
                <div className={`px-6 py-4 ${m.isActive ? 'bg-primary-light' : 'bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xl">🎫</span>
                      <h2 className="font-bold text-lg mt-2">{m.plan?.name}</h2>
                      <p className="text-sm text-muted mt-0.5">
                        {m.plan?.court?.name} · {m.plan?.court?.city}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        m.isActive ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-2xl font-extrabold text-primary">{formatPrice(m.plan?.price ?? 0)}</p>
                  <p className="text-sm text-muted mt-1">
                    {m.plan && DURATION_LABELS[m.plan.duration]} · 10% booking discount
                  </p>
                  {m.endDate && (
                    <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Valid until {formatDate(m.endDate)}
                    </p>
                  )}
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
