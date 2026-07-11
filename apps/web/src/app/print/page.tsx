'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { PrintListing } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { getPrintListings } from '@/lib/print';

export default function PrintShopPage() {
  const [listings, setListings] = useState<PrintListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getPrintListings({ search: search || undefined })
      .then((r) => setListings(r.items))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <PageShell>
      <Navbar />
      <section className="hero-mesh text-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-2">Custom apparel</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold">T-Shirt Printing</h1>
            <p className="text-white/75 mt-3 max-w-lg">Upload your design, pick size and color, and get custom tees printed by local partners.</p>
            <div className="flex flex-wrap gap-2 mt-6">
              <Link href="/print/orders" className="rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold">My orders</Link>
              <Link href="/printer" className="rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold">Printer login</Link>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 -mt-6">
        <div className="rounded-2xl border border-border bg-card p-4 mb-8 shadow-sm">
          <input
            type="search"
            placeholder="Search printers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>

        {loading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl skeleton" />)}</div>}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing, i) => (
            <FadeUp key={listing.id} delay={i * 0.05}>
              <Link href={`/print/${listing.id}`} className="block rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary transition-colors h-full">
                <span className="text-4xl">👕</span>
                <h2 className="font-bold text-lg mt-3">{listing.title}</h2>
                <p className="text-sm text-muted mt-1 line-clamp-2">{listing.description}</p>
                <div className="flex flex-wrap gap-2 mt-4 text-xs">
                  <span className="rounded-full bg-primary-light text-primary px-3 py-1 font-semibold">{formatPrice(listing.price)}/shirt</span>
                  <span className="rounded-full bg-background border border-border px-3 py-1">{listing.city}</span>
                  <span className="rounded-full bg-background border border-border px-3 py-1">{listing.turnaroundDays}d turnaround</span>
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
