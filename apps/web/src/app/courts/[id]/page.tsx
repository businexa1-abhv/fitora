'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DURATION_LABELS, SPORT_LABELS, SportType, type Court, type CourtSlot, type MembershipPlan } from '@fitora/shared';
import { AppHeader, PageShell, formatDate, formatPrice, formatTime } from '@/components/app-header';
import { SPORT_EMOJI, SPORT_GRADIENTS } from '@/lib/constants';
import { FadeUp } from '@/components/motion';
import { motion } from 'framer-motion';
import { ApiError } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import {
  createBooking,
  getCourt,
  getCourtSlots,
  getMembershipPlans,
  purchaseMembership,
} from '@/lib/courts';
import { completePayment } from '@/lib/payments';

function todayString() {
  return new Date().toISOString().split('T')[0];
}

export default function CourtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [court, setCourt] = useState<Court | null>(null);
  const [slots, setSlots] = useState<CourtSlot[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [date, setDate] = useState(todayString());
  const [loading, setLoading] = useState(true);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getCourt(id)
      .then(setCourt)
      .catch(() => setCourt(null))
      .finally(() => setLoading(false));
    getMembershipPlans(id).then(setPlans).catch(() => setPlans([]));
  }, [id]);

  useEffect(() => {
    getCourtSlots(id, date)
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [id, date]);

  async function handleBook(slotId: string) {
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user) {
      router.push('/login');
      return;
    }

    setBookingSlotId(slotId);
    setError('');
    setSuccess('');

    try {
      const checkout = await createBooking(token, slotId);
      const result = await completePayment(
        token,
        checkout.payment,
        user.email,
        `${user.firstName} ${user.lastName}`,
        `Court booking — ${court?.name}`,
      ) as { checkInCode?: string };

      const discount = checkout.membershipDiscount
        ? ` (${Math.round(checkout.membershipDiscount * 100)}% member discount applied)`
        : '';
      setSuccess(`Booked! Check-in code: ${result?.checkInCode ?? 'confirmed'}${discount}`);
      const updated = await getCourtSlots(id, date);
      setSlots(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBookingSlotId(null);
    }
  }

  async function handlePurchasePlan(planId: string) {
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user) {
      router.push('/login');
      return;
    }

    setPurchasingPlanId(planId);
    setError('');

    try {
      const { payment } = await purchaseMembership(token, planId);
      await completePayment(
        token,
        payment,
        user.email,
        `${user.firstName} ${user.lastName}`,
        'Fitora membership',
      );
      setSuccess('Membership activated!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setPurchasingPlanId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (!court) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted">Court not found</p>
        <Link href="/courts" className="text-primary text-sm hover:underline">
          Back to courts
        </Link>
      </div>
    );
  }

  const sport: SportType = (court.sportType as SportType | null) ?? SportType.OTHER;
  const availableSlots = slots.filter((s) => !s.isBooked && !s.isBlocked);
  const gradient = SPORT_GRADIENTS[sport] ?? SPORT_GRADIENTS[SportType.OTHER];
  const emoji = SPORT_EMOJI[sport] ?? '🏟️';

  return (
    <PageShell>
      <AppHeader backHref="/courts">
        <Link href="/memberships" className="text-sm font-semibold text-primary hover:underline">
          Memberships
        </Link>
      </AppHeader>

      {/* Venue hero */}
      <div className={`relative bg-gradient-to-br ${gradient} text-white py-12 sm:py-16`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-6xl sm:text-7xl block mb-4"
          >
            {emoji}
          </motion.span>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/80 text-sm font-semibold uppercase tracking-wider"
          >
            {SPORT_LABELS[sport]}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-extrabold mt-1"
          >
            {court.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/80 mt-2 flex items-center gap-2"
          >
            📍 {court.address}, {court.city}
          </motion.p>
          {court.amenities.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 flex flex-wrap gap-2"
            >
              {court.amenities.map((a) => (
                <span key={a} className="rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium">
                  {a}
                </span>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 -mt-6">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
            ✅ {success}
          </div>
        )}

        {plans.length > 0 && (
          <FadeUp className="mb-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">Membership plans</h2>
              <p className="text-sm text-muted mt-1">Members get 10% off every booking</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-xl border-2 border-border bg-background p-5 card-hover">
                    <h3 className="font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted mt-1">{DURATION_LABELS[plan.duration]}</p>
                    <p className="text-2xl font-extrabold text-primary mt-3">{formatPrice(plan.price)}</p>
                    <button
                      onClick={() => handlePurchasePlan(plan.id)}
                      disabled={purchasingPlanId === plan.id}
                      className="btn-outline w-full mt-4 !py-2 text-xs disabled:opacity-50"
                    >
                      {purchasingPlanId === plan.id ? 'Processing…' : 'Buy membership'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp delay={0.1}>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold">Pick a slot</h2>
                <p className="text-sm text-muted">Select date & time to book</p>
              </div>
              <input
                type="date"
                value={date}
                min={todayString()}
                onChange={(e) => setDate(e.target.value)}
                className="input-playo !w-auto"
              />
            </div>

            {availableSlots.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl">📅</span>
                <p className="text-muted mt-3">No slots for {formatDate(date)}</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableSlots.map((slot, i) => (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between rounded-xl border-2 border-border bg-background p-4 hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-sm">
                        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                      </p>
                      <p className="text-primary font-extrabold text-lg mt-1">{formatPrice(slot.price)}</p>
                    </div>
                    <button
                      onClick={() => handleBook(slot.id)}
                      disabled={bookingSlotId === slot.id}
                      className="btn-primary !px-4 !py-2 text-xs disabled:opacity-50"
                    >
                      {bookingSlotId === slot.id ? '…' : 'Book'}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </FadeUp>
      </main>
    </PageShell>
  );
}
