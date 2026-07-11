'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PaymentStatus, type ParentDashboard } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { getAccessToken } from '@/lib/auth';
import { getEnrollmentAttendance, getParentDashboard } from '@/lib/training';

export default function MyKidsPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<ParentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEnrollment, setExpandedEnrollment] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, { present: number; total: number; rate: number }>>({});

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getParentDashboard(token)
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, [router]);

  async function loadAttendance(token: string, enrollmentId: string) {
    if (attendance[enrollmentId]) {
      setExpandedEnrollment(expandedEnrollment === enrollmentId ? null : enrollmentId);
      return;
    }
    const data = await getEnrollmentAttendance(token, enrollmentId);
    setAttendance((prev) => ({
      ...prev,
      [enrollmentId]: {
        present: data.summary.present,
        total: data.summary.total,
        rate: data.summary.rate,
      },
    }));
    setExpandedEnrollment(enrollmentId);
  }

  const kids = dashboard?.kids ?? [];

  return (
    <PageShell>
      <Navbar />

      <section className="hero-mesh text-white py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl sm:text-4xl font-extrabold">Parent dashboard</h1>
            <p className="text-white/75 mt-2">Kids, enrollments, attendance & progress reports</p>
            <Link
              href="/training"
              className="inline-flex mt-5 rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              Browse programs →
            </Link>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 -mt-4 space-y-8">
        {dashboard && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted uppercase">Kids registered</p>
              <p className="text-3xl font-bold mt-1">{dashboard.kidsCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted uppercase">Active enrollments</p>
              <p className="text-3xl font-bold mt-1">{dashboard.activeEnrollments}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted uppercase">Attendance rate</p>
              <p className="text-3xl font-bold mt-1">
                {dashboard.attendance.total
                  ? Math.round((dashboard.attendance.present / dashboard.attendance.total) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl skeleton" />
            ))}
          </div>
        )}

        {!loading && kids.length === 0 && (
          <FadeUp>
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
              <span className="text-4xl">👶</span>
              <p className="text-lg font-semibold mt-4">No kids registered yet</p>
              <Link href="/training" className="btn-primary mt-6 inline-flex">
                Find a program
              </Link>
            </div>
          </FadeUp>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {kids.map((kid, i) => (
            <FadeUp key={kid.id} delay={i * 0.08}>
              <div className="card-hover rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary text-lg font-bold">
                    {kid.firstName[0]}
                  </span>
                  <div>
                    <h2 className="font-bold text-lg">
                      {kid.firstName} {kid.lastName}
                    </h2>
                    <p className="text-sm text-muted">
                      Age {kid.age ?? '—'} · DOB {new Date(kid.dateOfBirth).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                {kid.medicalNotes && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                    Medical: {kid.medicalNotes}
                  </p>
                )}

                {kid.enrollments && kid.enrollments.length > 0 ? (
                  <div className="space-y-2">
                    {kid.enrollments.map((e) => (
                      <div key={e.id} className="rounded-xl border border-border bg-background p-3.5 text-sm">
                        <p className="font-semibold">{e.batch?.program?.name ?? e.batch?.name}</p>
                        <p className="text-muted text-xs mt-0.5">{e.batch?.schedule}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="rounded-full bg-primary-light text-primary px-2 py-0.5 text-xs font-semibold capitalize">
                            {e.status.toLowerCase()}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              e.paymentStatus === PaymentStatus.PAID
                                ? 'bg-green-50 text-green-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {e.paymentStatus === PaymentStatus.PAID ? 'Paid' : 'Payment pending'}
                          </span>
                        </div>
                        {e.paymentStatus === PaymentStatus.PAID && (
                          <button
                            type="button"
                            onClick={() => {
                              const token = getAccessToken();
                              if (token) loadAttendance(token, e.id);
                            }}
                            className="text-xs text-primary font-semibold mt-2 hover:underline"
                          >
                            {expandedEnrollment === e.id ? 'Hide attendance' : 'View attendance'}
                          </button>
                        )}
                        {expandedEnrollment === e.id && attendance[e.id] && (
                          <p className="text-xs text-muted mt-1">
                            {attendance[e.id].present}/{attendance[e.id].total} sessions attended (
                            {attendance[e.id].rate}%)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No enrollments yet</p>
                )}
              </div>
            </FadeUp>
          ))}
        </div>

        {dashboard && dashboard.recentReports.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Recent progress reports</h2>
            <div className="space-y-3">
              {dashboard.recentReports.map((report) => (
                <div key={report.id} className="rounded-xl border border-border p-4 text-sm">
                  <p className="font-semibold">{report.summary.slice(0, 120)}…</p>
                  <p className="text-xs text-muted mt-1">
                    {report.periodStart} – {report.periodEnd}
                    {report.rating ? ` · Rating ${report.rating}/5` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </PageShell>
  );
}
