'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookingStatus,
  SPORT_LABELS,
  UserRole,
  type Booking,
  type SportType,
} from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatDate, formatPrice, formatTime } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { SPORT_EMOJI } from '@/lib/constants';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { getMyBookings } from '@/lib/courts';
import { CancelBookingDialog } from '@/components/cancel-booking-dialog';

const STATUS_STYLES: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'bg-amber-50 text-amber-700',
  [BookingStatus.CONFIRMED]: 'bg-primary-light text-primary',
  [BookingStatus.CANCELLED]: 'bg-red-50 text-red-600',
  [BookingStatus.COMPLETED]: 'bg-slate-100 text-slate-600',
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user) {
      router.replace('/login');
      return;
    }

    getMyBookings(token)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [router]);

  const isOwner = getStoredUser()?.roles.includes(UserRole.COURT_OWNER);

  return (
    <PageShell>
      {/* P0-5: Booking cancellation dialog */}
      <CancelBookingDialog
        booking={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={(id) => {
          setBookings((prev) =>
            prev.map((b) => (b.id === id ? { ...b, status: BookingStatus.CANCELLED } : b)),
          );
          setCancelTarget(null);
        }}
      />
      <Navbar />

      <section className="hero-mesh text-white py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <p className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-1">
                Your schedule
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold">My bookings</h1>
              <p className="text-white/75 mt-2">
                {bookings.length > 0
                  ? `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`
                  : 'Track your court reservations'}
              </p>
            </div>
            <div className="flex gap-2">
              {isOwner && (
                <Link
                  href="/owner/courts"
                  className="rounded-xl bg-white/20 backdrop-blur px-4 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
                >
                  Manage courts
                </Link>
              )}
              <Link
                href="/courts"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary hover:bg-white/90 transition-colors"
              >
                Book a court
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 -mt-4">
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl skeleton" />
            ))}
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <FadeUp>
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
              <span className="text-4xl">📅</span>
              <p className="text-lg font-semibold mt-4">No bookings yet</p>
              <p className="text-muted text-sm mt-1 mb-6">Find a court and book your first slot</p>
              <Link
                href="/courts"
                className="inline-flex rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors"
              >
                Browse courts
              </Link>
            </div>
          </FadeUp>
        )}

        <div className="space-y-4">
          {bookings.map((booking, i) => {
            const sport = booking.court?.sportType;
            const emoji = sport ? SPORT_EMOJI[sport as SportType] : '🏟️';
            return (
              <FadeUp key={booking.id} delay={i * 0.06}>
                <div className="card-hover rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-xl shrink-0">
                        {emoji}
                      </span>
                      <div>
                        <h2 className="font-bold text-lg">{booking.court?.name}</h2>
                        <p className="text-sm text-muted mt-0.5">
                          {booking.court?.sportType
                            ? SPORT_LABELS[booking.court.sportType as SportType]
                            : 'Sport'}{' '}
                          · {booking.court?.city}
                        </p>
                        {booking.slot && (
                          <p className="text-sm mt-2 font-medium">
                            {formatDate(booking.slot.startTime)},{' '}
                            {formatTime(booking.slot.startTime)} –{' '}
                            {formatTime(booking.slot.endTime)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-extrabold text-primary">
                        {formatPrice(booking.totalAmount)}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          STATUS_STYLES[booking.status as BookingStatus] ??
                          'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {booking.status.toLowerCase()}
                      </span>
                      {booking.checkInCode && (
                        <div className="mt-3 rounded-xl bg-primary-light border border-primary/20 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                            Check-in
                          </p>
                          <p className="font-mono font-bold text-primary text-sm">
                            {booking.checkInCode}
                          </p>
                        </div>
                      )}
                      {booking.status === BookingStatus.CONFIRMED && (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(booking)}
                          className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Cancel booking
                        </button>
                      )}
                    </div>
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
