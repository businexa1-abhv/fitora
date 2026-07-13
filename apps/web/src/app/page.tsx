'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { APP_NAME, SPORT_LABELS } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { SportChip } from '@/components/sport-chip';
import { FadeUp } from '@/components/motion';
import { POPULAR_SPORTS, POPULAR_CITIES } from '@/lib/constants';

const FEATURES = [
  {
    icon: '📅',
    title: 'Instant booking',
    desc: 'Pick a slot, pay, and get your check-in code in seconds.',
  },
  { icon: '🏅', title: 'Memberships', desc: 'Monthly & quarterly plans with exclusive discounts.' },
  {
    icon: '👦',
    title: 'Kids coaching',
    desc: 'Enroll children, track attendance & progress digitally.',
  },
  {
    icon: '🛒',
    title: 'Sports shop',
    desc: 'Gear, trophies & custom apparel — shop now.',
    href: '/shop',
  },
  {
    icon: '🔧',
    title: 'Sports services',
    desc: 'Stringing, bat repair, grip replacement & equipment rental.',
    href: '/services',
  },
  {
    icon: '👕',
    title: 'Custom printing',
    desc: 'Upload designs for team t-shirts & event apparel.',
    href: '/print',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar transparent />

      {/* Hero */}
      <section className="hero-mesh text-white relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-[calc(var(--nav-height)+1.5rem)] pb-20 sm:pt-[calc(var(--nav-height)+3rem)] sm:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-white/80 text-sm font-semibold uppercase tracking-widest mb-4"
              >
                India&apos;s sports platform
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight"
              >
                Book sports venues.
                <br />
                <span className="text-white/90">Train kids.</span>
                <br />
                <span className="text-emerald-200">Find coaches near you.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="mt-6 text-lg text-white/75 max-w-lg leading-relaxed"
              >
                {APP_NAME} is your one-stop platform to book courts, buy memberships, and enroll in
                kids training — inspired by the best sports apps.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Link href="/courts" className="btn-white shadow-lg">
                  Book a venue
                </Link>
                <Link
                  href="/training"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all"
                >
                  Find training
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-10 flex items-center gap-6 text-sm text-white/70"
              >
                <div>
                  <span className="text-2xl font-bold text-white block">500+</span> Venues
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <span className="text-2xl font-bold text-white block">50+</span> Cities
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <span className="text-2xl font-bold text-white block">10K+</span> Players
                </div>
              </motion.div>
            </div>

            {/* Floating sport cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="hidden lg:grid grid-cols-2 gap-4"
            >
              {POPULAR_SPORTS.slice(0, 4).map((sport, i) => (
                <motion.div
                  key={sport}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
                  className={`${i % 2 === 1 ? 'mt-8' : ''}`}
                >
                  <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-6 text-center hover:bg-white/20 transition-colors">
                    <span className="text-4xl">
                      {POPULAR_SPORTS.indexOf(sport) >= 0 ? ['🏸', '⚽', '🏏', '🎾'][i] : '🏟️'}
                    </span>
                    <p className="mt-2 font-semibold">{SPORT_LABELS[sport]}</p>
                    <p className="text-xs text-white/60 mt-1">Book now</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full">
            <path
              d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z"
              fill="var(--background)"
            />
          </svg>
        </div>
      </section>

      {/* Popular Sports */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp>
            <h2 className="text-2xl sm:text-3xl font-bold text-center">Popular sports</h2>
            <p className="text-muted text-center mt-2">Pick a sport and find venues near you</p>
          </FadeUp>

          <div className="mt-10 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible">
            {POPULAR_SPORTS.map((sport, i) => (
              <div key={sport} className="snap-start shrink-0 sm:shrink">
                <SportChip sport={sport} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities */}
      <section className="py-12 bg-card border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp>
            <h2 className="text-xl font-bold">Top cities</h2>
            <p className="text-muted text-sm mt-1">Sports complexes in popular locations</p>
          </FadeUp>
          <div className="mt-6 flex flex-wrap gap-2">
            {POPULAR_CITIES.map((city, i) => (
              <FadeUp key={city} delay={i * 0.05}>
                <Link
                  href={`/courts?city=${encodeURIComponent(city)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary hover:bg-primary-light transition-all"
                >
                  📍 {city}
                </Link>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Everything in one app</h2>
            <p className="text-muted mt-2 max-w-xl mx-auto">
              From booking to training to gear — {APP_NAME} has you covered
            </p>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => {
              const card = (
                <div className="card-hover rounded-2xl bg-card border border-border p-6 h-full">
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="font-bold mt-4">{f.title}</h3>
                  <p className="text-sm text-muted mt-2 leading-relaxed">{f.desc}</p>
                </div>
              );
              return (
                <FadeUp key={f.title} delay={i * 0.1}>
                  {'href' in f && f.href ? (
                    <Link href={f.href} className="block h-full">
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeUp>
            <div className="rounded-3xl hero-gradient p-8 sm:p-12 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 hero-mesh opacity-50" />
              <div className="relative">
                <h2 className="text-2xl sm:text-4xl font-extrabold">Ready to play?</h2>
                <p className="mt-3 text-white/80 max-w-md mx-auto">
                  Join thousands of players booking courts and training sessions every day.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/register" className="btn-white">
                    Create free account
                  </Link>
                  <Link
                    href="/courts"
                    className="inline-flex items-center justify-center rounded-xl border-2 border-white/40 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition-all"
                  >
                    Browse venues
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
