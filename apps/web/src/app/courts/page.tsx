'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SPORT_LABELS, type SportType, type Court } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { CourtCard, CourtCardSkeleton } from '@/components/court-card';
import { SportChip } from '@/components/sport-chip';
import { FadeUp } from '@/components/motion';
import { POPULAR_SPORTS } from '@/lib/constants';
import { getCourts } from '@/lib/courts';
import { CitySelect } from '@/components/city-select';

function CourtsContent() {
  const searchParams = useSearchParams();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [sportType, setSportType] = useState(searchParams.get('sport') ?? '');

  useEffect(() => {
    setCity(searchParams.get('city') ?? '');
    setSportType(searchParams.get('sport') ?? '');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    getCourts({
      search: search || undefined,
      city: city || undefined,
      sportType: (sportType as SportType) || undefined,
    })
      .then((res) => setCourts(res.items))
      .catch(() => setCourts([]))
      .finally(() => setLoading(false));
  }, [search, city, sportType]);

  return (
    <>
      {/* Search hero strip */}
      <section className="hero-mesh text-white py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl font-extrabold"
          >
            Book sports venues
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/75 mt-2"
          >
            Find and book courts near you
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 grid gap-3 sm:grid-cols-3 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20"
          >
            <input
              type="text"
              placeholder="🔍 Search venues..."
              className="rounded-xl bg-white/95 text-foreground px-4 py-3 text-sm outline-none placeholder:text-muted"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <CitySelect
              value={city}
              onChange={setCity}
              placeholder="📍 Select city"
              variant="hero"
            />
            <select
              className="rounded-xl bg-white/95 text-foreground px-4 py-3 text-sm outline-none"
              value={sportType}
              onChange={(e) => setSportType(e.target.value)}
            >
              <option value="">All sports</option>
              {Object.entries(SPORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        {/* Sport filter chips */}
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <button
            type="button"
            onClick={() => setSportType('')}
            className={`shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 min-w-[100px] transition-all ${
              !sportType
                ? 'border-primary bg-primary-light shadow-md'
                : 'border-transparent bg-card hover:shadow-md'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-2xl">
              🏟️
            </div>
            <span className="text-xs font-semibold">All</span>
          </button>
          {POPULAR_SPORTS.map((sport, i) => (
            <SportChip
              key={sport}
              sport={sport}
              index={i}
              asLink={false}
              active={sportType === sport}
              onClick={() => setSportType(sportType === sport ? '' : sport)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted">
            {loading
              ? 'Searching…'
              : `${courts.length} venue${courts.length !== 1 ? 's' : ''} found`}
          </p>
          <Link href="/bookings" className="text-sm font-semibold text-primary hover:underline">
            My bookings →
          </Link>
        </div>

        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourtCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && courts.length === 0 && (
          <FadeUp>
            <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center bg-card">
              <span className="text-5xl">🏟️</span>
              <p className="mt-4 font-semibold text-lg">No venues found</p>
              <p className="text-muted text-sm mt-1">Try a different city or sport</p>
            </div>
          </FadeUp>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courts.map((court, i) => (
            <CourtCard key={court.id} court={court} index={i} />
          ))}
        </div>
      </main>
    </>
  );
}

export default function CourtsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Suspense fallback={<div className="py-20 text-center text-muted">Loading…</div>}>
        <CourtsContent />
      </Suspense>
      <Footer />
    </div>
  );
}
