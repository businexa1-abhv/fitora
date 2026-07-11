'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SPORT_LABELS, SportType, type TrainingProgram } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { SPORT_EMOJI, SPORT_GRADIENTS } from '@/lib/constants';
import { getTrainingPrograms } from '@/lib/courts';

export default function TrainingPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrainingPrograms()
      .then(setPrograms)
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <Navbar />

      <section className="hero-mesh text-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-2">
              Kids coaching
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold">Training programs</h1>
            <p className="text-white/75 mt-3 max-w-lg">
              Enroll your child in expert-led coaching programs at top venues near you.
            </p>
            <Link
              href="/training/my-kids"
              className="inline-flex mt-6 rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              My kids →
            </Link>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 -mt-6">
        {loading && (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 rounded-2xl skeleton" />
            ))}
          </div>
        )}

        {!loading && programs.length === 0 && (
          <FadeUp>
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
              <span className="text-4xl">🏅</span>
              <p className="text-lg font-semibold mt-4">No programs yet</p>
              <p className="text-muted text-sm mt-1">Check back soon for new coaching programs</p>
            </div>
          </FadeUp>
        )}

        <div className="space-y-8">
          {programs.map((program, pi) => {
            const sport: SportType = (program.sportType as SportType | null) ?? SportType.OTHER;
            return (
            <FadeUp key={program.id} delay={pi * 0.08}>
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className={`bg-gradient-to-r ${SPORT_GRADIENTS[sport]} px-6 py-5 text-white`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="text-2xl">{SPORT_EMOJI[sport]}</span>
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mt-2">
                        {SPORT_LABELS[sport]}
                      </p>
                      <h2 className="text-xl font-extrabold mt-0.5">{program.name}</h2>
                      <p className="text-white/80 text-sm mt-1">
                        {program.court?.name} · Ages {program.minAge}–{program.maxAge}
                      </p>
                    </div>
                    <p className="text-2xl font-extrabold">{formatPrice(program.fee)}</p>
                  </div>
                  {program.description && (
                    <p className="text-white/80 text-sm mt-3 max-w-2xl">{program.description}</p>
                  )}
                </div>

                <div className="p-6">
                  {program.batches && program.batches.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {program.batches.map((batch) => {
                        const enrolled = batch._count?.enrollments ?? 0;
                        const pct = Math.round((enrolled / batch.maxCapacity) * 100);
                        return (
                          <div
                            key={batch.id}
                            className="card-hover rounded-xl border border-border bg-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <p className="font-semibold">{batch.name}</p>
                              <p className="text-xs text-muted mt-1">{batch.schedule}</p>
                              <p className="text-xs text-muted">
                                Coach: {batch.trainer?.firstName} {batch.trainer?.lastName}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-border max-w-[120px]">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted">
                                  {enrolled}/{batch.maxCapacity}
                                </span>
                              </div>
                            </div>
                            <Link
                              href={`/training/enroll/${batch.id}?fee=${program.fee}&program=${encodeURIComponent(program.name)}`}
                              className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors text-center"
                            >
                              Enroll
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No batches open yet</p>
                  )}
                </div>
              </div>
            </FadeUp>
          );
          })}
        </div>
      </main>
    </PageShell>
  );
}
