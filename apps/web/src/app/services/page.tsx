'use client';

import React from 'react';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { SERVICE_CATEGORY_LABELS } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';
import { ServiceCard, ServiceCardSkeleton } from '@/components/service-card';
import { FadeUp } from '@/components/motion';
import { getListings } from '@/lib/marketplace';
import { MARKETPLACE_CATEGORIES } from '@/lib/marketplace-constants';
import type { ServiceListing } from '@fitora/shared';

function ServicesContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');

  useEffect(() => {
    setCategory(searchParams.get('category') ?? '');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    getListings({
      search: search || undefined,
      category: category || undefined,
    })
      .then((res) => setListings(res.items))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [search, category]);

  return (
    <>
      <section className="hero-mesh text-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-2">
              Sports service marketplace
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold">
              Stringing, repairs & equipment rental
            </h1>
            <p className="text-white/75 mt-3 max-w-lg">
              Book racket stringing, bat repair, ball repair, grip replacement, and equipment rental from verified providers.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              <Link
                href="/services/orders"
                className="rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                My orders
              </Link>
              <Link
                href="/provider"
                className="rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                Provider login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 -mt-6">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm mb-8">
          <input
            type="search"
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setCategory('')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                !category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background border border-border text-muted hover:border-primary'
              }`}
            >
              All
            </button>
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  category === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border border-border text-muted hover:border-primary'
                }`}
              >
                {SERVICE_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <FadeUp>
            <div className="text-center py-16 rounded-2xl border border-dashed border-border">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold">No services found</p>
              <p className="text-sm text-muted mt-1">Try a different category or search term</p>
            </div>
          </FadeUp>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing, i) => (
              <ServiceCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function ServicesPage(): React.JSX.Element {
  return (
    <PageShell>
      <Navbar />
      <Suspense>
        <ServicesContent />
      </Suspense>
    </PageShell>
  );
}
