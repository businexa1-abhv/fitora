'use client';

import React from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { SPORT_LABELS, type SportType, type Court } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { CourtCard, CourtCardSkeleton } from '@/components/court-card';
import { FadeUp } from '@/components/motion';
import { POPULAR_SPORTS } from '@/lib/constants';
import { getCourts } from '@/lib/courts';
import { CitySelect } from '@/components/city-select';

const SPORT_EMOJIS: Record<string, string> = {
  BADMINTON: '🏸', FOOTBALL: '⚽', CRICKET: '🏏', TENNIS: '🎾', SWIMMING: '🏊', GYM: '💪', OTHER: '🏟️',
};

const AMENITIES = ['Parking', 'Changing Room', 'AC', 'Cafeteria', 'Equipment Rental'];

function CourtsContent() {
  const searchParams = useSearchParams();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [sportType, setSportType] = useState(searchParams.get('sport') ?? '');
  const [amenities, setAmenities] = useState<string[]>([]);

  useEffect(() => {
    setCity(searchParams.get('city') ?? '');
    setSportType(searchParams.get('sport') ?? '');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    getCourts({ search: search || undefined, city: city || undefined, sportType: (sportType as SportType) || undefined })
      .then((res) => setCourts(res.items))
      .catch(() => setCourts([]))
      .finally(() => setLoading(false));
  }, [search, city, sportType]);

  function toggleAmenity(a: string) {
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  return (
    <>
      {/* Page header */}
      <div className="border-b border-border bg-card sticky top-[var(--nav-height)] z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 border border-border rounded-xl bg-background px-4 py-2.5">
            <span className="text-muted">🔍</span>
            <input
              type="text"
              placeholder="Search venues..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CitySelect value={city} onChange={setCity} placeholder="📍 All cities" />
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSportType('')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${!sportType ? 'bg-primary text-white border-primary' : 'border-border text-foreground hover:border-primary'}`}
            >
              All
            </button>
            {POPULAR_SPORTS.map((sport) => (
              <button
                key={sport}
                onClick={() => setSportType(sportType === sport ? '' : sport)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all flex items-center gap-1.5 ${sportType === sport ? 'bg-primary text-white border-primary' : 'border-border text-foreground hover:border-primary'}`}
              >
                {SPORT_EMOJIS[sport]} {SPORT_LABELS[sport as SportType]}
              </button>
            ))}
          </div>
          <select className="shrink-0 border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none">
            <option>Sort: Recommended</option>
            <option>Price: Low to High</option>
            <option>Rating</option>
            <option>Distance</option>
          </select>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="flex gap-8">
          {/* ── Sidebar Filters ── */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-[calc(var(--nav-height)+4.5rem)] rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-sm">Filters</h3>
                <button
                  onClick={() => { setSportType(''); setCity(''); setAmenities([]); }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Clear All
                </button>
              </div>

              {/* Sport filter */}
              <div className="mb-5">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Sport</p>
                <div className="flex flex-col gap-2">
                  {POPULAR_SPORTS.map((sport) => (
                    <label key={sport} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sportType === sport}
                        onChange={() => setSportType(sportType === sport ? '' : sport)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{SPORT_EMOJIS[sport]} {SPORT_LABELS[sport as SportType]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div className="mb-5">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Price / hr</p>
                <div className="flex items-center justify-between text-xs text-muted mb-2">
                  <span>₹100</span><span>₹2,000</span>
                </div>
                <input type="range" min="100" max="2000" className="w-full accent-primary" />
              </div>

              {/* Amenities */}
              <div className="mb-5">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Amenities</p>
                <div className="flex flex-col gap-2">
                  {AMENITIES.map((a) => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={amenities.includes(a)}
                        onChange={() => toggleAmenity(a)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Min. Rating</p>
                <div className="flex gap-2">
                  {[3, 4, 5].map((r) => (
                    <button key={r} className="flex-1 py-1.5 rounded-lg border border-border text-xs font-semibold hover:border-primary hover:text-primary transition-all">
                      {r}⭐+
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main Results ── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted">
                {loading ? 'Searching…' : `${courts.length} venue${courts.length !== 1 ? 's' : ''} found${city ? ` in ${city}` : ''}`}
              </p>
              <Link href="/bookings" className="text-sm font-semibold text-primary hover:underline">
                My bookings →
              </Link>
            </div>

            {loading && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <CourtCardSkeleton key={i} />)}
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

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courts.map((court, i) => (
                <CourtCard key={court.id} court={court} index={i} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function CourtsPage(): React.JSX.Element {
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
