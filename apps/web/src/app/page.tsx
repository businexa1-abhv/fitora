'use client';

import React from 'react';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { APP_NAME, SPORT_LABELS } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { SportChip } from '@/components/sport-chip';
import { FadeUp } from '@/components/motion';
import { POPULAR_SPORTS, POPULAR_CITIES } from '@/lib/constants';

const FEATURES = [
  { icon: '📅', title: 'Instant Booking', desc: 'Pick a slot, pay, and get your check-in code in seconds.', href: '/courts' },
  { icon: '🏅', title: 'Memberships', desc: 'Monthly & quarterly plans with exclusive discounts and perks.', href: '/memberships' },
  { icon: '👦', title: 'Kids Coaching', desc: 'Enroll children in sport academies, track attendance & progress.', href: '/training' },
  { icon: '🛒', title: 'Sports Shop', desc: 'Gear, trophies & custom apparel — shop and get delivered.', href: '/shop' },
  { icon: '🔧', title: 'Sports Services', desc: 'Stringing, bat repair, grip replacement & equipment rental.', href: '/services' },
  { icon: '👕', title: 'Custom Printing', desc: 'Upload designs for team t-shirts & event apparel.', href: '/print' },
];

const STATS = [
  { value: '5,000+', label: 'Players' },
  { value: '200+', label: 'Venues' },
  { value: '50+', label: 'Academies' },
  { value: '₹1Cr+', label: 'Transactions' },
];

const SPORT_EMOJIS: Record<string, string> = {
  BADMINTON: '🏸', FOOTBALL: '⚽', CRICKET: '🏏', TENNIS: '🎾', SWIMMING: '🏊', GYM: '💪', OTHER: '🏟️',
};

export default function HomePage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar transparent />

      {/* ── HERO ── */}
      <section className="hero-mesh text-white relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-[calc(var(--nav-height)+2rem)] pb-24 sm:pt-[calc(var(--nav-height)+4rem)]">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/70 text-xs font-bold uppercase tracking-widest mb-4"
          >
            India&apos;s Sports Platform
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight max-w-3xl"
          >
            Book Courts.{' '}
            <span className="text-orange-200">Join Games.</span>{' '}
            Train Together.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-lg text-white/75 max-w-xl"
          >
            {APP_NAME} — book courts, buy memberships, enroll kids in training, and shop gear. All in one platform.
          </motion.p>

          {/* Search + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl"
          >
            <div className="flex-1 flex items-center gap-2 bg-white/95 rounded-xl px-4 py-3">
              <span className="text-muted">🔍</span>
              <input
                type="text"
                placeholder="Search venues, sports, events..."
                className="flex-1 text-foreground text-sm outline-none bg-transparent placeholder:text-muted"
              />
            </div>
            <Link href="/courts" className="btn-white shrink-0 text-center shadow-lg font-bold">
              Find a Venue
            </Link>
          </motion.div>

          {/* Sport quick chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-5 flex flex-wrap gap-2"
          >
            {POPULAR_SPORTS.map((sport) => (
              <Link
                key={sport}
                href={`/courts?sport=${sport}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1.5 text-xs font-semibold hover:bg-white/25 transition-all"
              >
                {SPORT_EMOJIS[sport] ?? '🏟️'} {SPORT_LABELS[sport]}
              </Link>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex items-center gap-8 text-sm text-white/70"
          >
            {STATS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-8">
                <div>
                  <span className="text-2xl font-bold text-white block">{s.value}</span>
                  <span>{s.label}</span>
                </div>
                {i < STATS.length - 1 && <div className="w-px h-8 bg-white/20" />}
              </div>
            ))}
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full">
            <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      {/* ── SPORT QUICK LINKS ── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">What do you want to play?</h2>
            <p className="text-muted mt-2">Pick a sport and find courts near you instantly</p>
          </FadeUp>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible">
            {POPULAR_SPORTS.map((sport, i) => (
              <div key={sport} className="snap-start shrink-0 sm:shrink">
                <SportChip sport={sport} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED VENUES ── */}
      <section className="py-16 bg-card border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Featured Venues</h2>
              <p className="text-muted mt-1">Top-rated courts in your city</p>
            </div>
            <Link href="/courts" className="text-sm font-bold text-primary hover:underline">
              See all venues →
            </Link>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Smash Arena', sport: 'Badminton', area: 'Kondapur, Hyderabad', rating: '4.8', reviews: 312, price: '₹300/hr', emoji: '🏸', available: true },
              { name: 'KPHB Badminton', sport: 'Badminton', area: 'KPHB Colony, Hyderabad', rating: '4.6', reviews: 198, price: '₹250/hr', emoji: '🏸', available: true },
              { name: 'Greenfield FC', sport: 'Football', area: 'Gachibowli, Hyderabad', rating: '4.7', reviews: 89, price: '₹600/hr', emoji: '⚽', available: false },
            ].map((v, i) => (
              <FadeUp key={v.name} delay={i * 0.1}>
                <Link href="/courts" className="block group">
                  <div className="rounded-2xl border border-border bg-background overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                    <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                      <span className="text-7xl">{v.emoji}</span>
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-bold text-foreground rounded-full px-3 py-1">
                        {v.sport}
                      </div>
                      <div className="absolute top-3 right-3 bg-primary text-white text-xs font-bold rounded-full px-2 py-1">
                        ✓ Verified
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-foreground">{v.name}</h3>
                          <p className="text-xs text-muted mt-0.5">📍 {v.area}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${v.available ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {v.available ? '● Available' : '● Booked'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-muted">⭐ {v.rating} ({v.reviews})</span>
                        <span className="text-sm font-bold text-primary">{v.price}</span>
                      </div>
                      <Link
                        href="/courts"
                        className="mt-3 block text-center bg-primary text-white text-sm font-bold rounded-xl py-2.5 hover:bg-primary-dark transition-colors"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </Link>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVENTS BANNER ── */}
      <section className="py-16 hero-mesh text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Upcoming Events & Tournaments</h2>
              <p className="text-white/70 mt-1">Register and compete with players across the city</p>
            </div>
            <Link href="/courts" className="text-sm font-bold text-white/80 hover:text-white">
              All events →
            </Link>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { emoji: '🏸', sport: 'Badminton', title: 'Hyderabad Badminton Open', date: 'Sat 19 Jul 2026', venue: 'Smash Arena', fee: '₹500' },
              { emoji: '⚽', sport: 'Football', title: 'Gachibowli 5-a-Side Cup', date: 'Sun 20 Jul 2026', venue: 'Greenfield FC', fee: '₹300' },
              { emoji: '🏏', sport: 'Cricket', title: 'City T10 League', date: 'Sat 26 Jul 2026', venue: 'City Cricket Club', fee: '₹800' },
            ].map((ev, i) => (
              <FadeUp key={ev.title} delay={i * 0.1}>
                <div className="rounded-2xl bg-white/10 border border-white/20 p-5 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{ev.emoji}</span>
                    <span className="text-xs font-bold bg-white/20 rounded-full px-3 py-1">{ev.sport}</span>
                  </div>
                  <h3 className="font-bold text-lg">{ev.title}</h3>
                  <p className="text-white/70 text-sm mt-1">{ev.date} · {ev.venue}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold">Register {ev.fee}</span>
                    <button className="bg-white text-primary text-xs font-bold rounded-lg px-4 py-2 hover:bg-orange-50 transition-colors">
                      Register
                    </button>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACADEMIES ── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Academies Spotlight</h2>
              <p className="text-muted mt-1">Give your child the champion&apos;s start</p>
            </div>
            <Link href="/training" className="text-sm font-bold text-primary hover:underline">
              All academies →
            </Link>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { initials: 'KA', name: 'KPHB Badminton Academy', sport: 'Badminton', age: 'U-14 & Adults', coach: 'Coach Suresh', fee: '₹2,000/mo', color: '#059669' },
              { initials: 'CA', name: 'City Cricket Academy', sport: 'Cricket', age: 'U-16 & Seniors', coach: 'Coach Rajan', fee: '₹2,500/mo', color: '#2563EB' },
              { initials: 'FA', name: 'Gachibowli Football Club', sport: 'Football', age: 'U-12 to U-18', coach: 'Coach Priya', fee: '₹1,800/mo', color: '#7C3AED' },
            ].map((ac, i) => (
              <FadeUp key={ac.name} delay={i * 0.1}>
                <div className="rounded-2xl border border-border bg-background p-5 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: ac.color }}>
                      {ac.initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{ac.name}</h3>
                      <p className="text-xs text-muted">{ac.sport} · {ac.age}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted">{ac.coach}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">{ac.fee}</p>
                    </div>
                    <Link href="/training" className="bg-primary-light text-primary text-xs font-bold rounded-xl px-4 py-2 hover:bg-primary hover:text-white transition-colors">
                      Enroll
                    </Link>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16 sm:py-24 bg-card border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Everything in one app</h2>
            <p className="text-muted mt-2 max-w-xl mx-auto">
              From booking to training to gear — {APP_NAME} has you covered
            </p>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.08}>
                <Link href={f.href} className="block group h-full">
                  <div className="rounded-2xl bg-background border border-border p-6 h-full hover:border-primary hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                    <span className="text-3xl">{f.icon}</span>
                    <h3 className="font-bold mt-4 group-hover:text-primary transition-colors">{f.title}</h3>
                    <p className="text-sm text-muted mt-2 leading-relaxed">{f.desc}</p>
                  </div>
                </Link>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITIES ── */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp>
            <h2 className="text-xl font-bold mb-6">Top Cities</h2>
          </FadeUp>
          <div className="flex flex-wrap gap-2">
            {POPULAR_CITIES.map((city, i) => (
              <FadeUp key={city} delay={i * 0.05}>
                <Link
                  href={`/courts?city=${encodeURIComponent(city)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary hover:bg-primary-light transition-all"
                >
                  📍 {city}
                </Link>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp>
            <div className="rounded-3xl hero-gradient p-8 sm:p-14 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 hero-mesh opacity-50" />
              <div className="relative">
                <h2 className="text-3xl sm:text-5xl font-extrabold">Ready to play?</h2>
                <p className="mt-3 text-white/80 max-w-md mx-auto text-lg">
                  Join 5,000+ players booking courts every day in Hyderabad & Bengaluru.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/register" className="btn-white shadow-lg font-bold">
                    Create Free Account
                  </Link>
                  <Link
                    href="/courts"
                    className="inline-flex items-center justify-center rounded-xl border-2 border-white/40 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition-all"
                  >
                    Browse Venues
                  </Link>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <Footer />
    </div>
  );
}
