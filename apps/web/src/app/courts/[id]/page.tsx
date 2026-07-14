'use client';

import React from 'react';

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

const AMENITY_ICONS: Record<string, string> = {
  'Parking': '🅿️', 'Changing Room': '🚿', 'Cafeteria': '☕', 'AC': '❄️',
  'Equipment Rental': '🎾', 'WiFi': '📶', 'Seating': '💺',
};

const TABS = ['Overview', 'Book', 'Reviews', 'Policies'];

function todayString() {
  return new Date().toISOString().split('T')[0];
}

export default function CourtDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [court, setCourt] = useState<Court | null>(null);
  const [slots, setSlots] = useState<CourtSlot[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [date, setDate] = useState(todayString());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Book');
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
    getCourtSlots(id, date).then(setSlots).catch(() => setSlots([]));
  }, [id, date]);

  async function handleBook(slotId: string) {
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user) { router.push('/login'); return; }
    setBookingSlotId(slotId);
    setError(''); setSuccess('');
    try {
      const checkout = await createBooking(token, slotId);
      const result = await completePayment(token, checkout.payment, user.email, `${user.firstName} ${user.lastName}`, `Court booking — ${court?.name}`) as { checkInCode?: string };
      const discount = checkout.membershipDiscount ? ` (${Math.round(checkout.membershipDiscount * 100)}% member discount)` : '';
      setSuccess(`Booked! Check-in code: ${result?.checkInCode ?? 'confirmed'}${discount}`);
      const updated = await getCourtSlots(id, date);
      setSlots(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Booking failed');
    } finally { setBookingSlotId(null); }
  }

  async function handlePurchasePlan(planId: string) {
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user) { router.push('/login'); return; }
    setPurchasingPlanId(planId);
    setError('');
    try {
      const { payment } = await purchaseMembership(token, planId);
      await completePayment(token, payment, user.email, `${user.firstName} ${user.lastName}`, 'Fitora membership');
      setSuccess('Membership activated!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Purchase failed');
    } finally { setPurchasingPlanId(null); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted text-sm">Loading…</p></div>;
  if (!court) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted">Court not found</p>
      <Link href="/courts" className="text-primary text-sm hover:underline">Back to courts</Link>
    </div>
  );

  const sport: SportType = (court.sportType as SportType | null) ?? SportType.OTHER;
  const allSlots = slots;
  const emoji = SPORT_EMOJI[sport] ?? '🏟️';

  return (
    <PageShell>
      <AppHeader backHref="/courts">
        <Link href="/memberships" className="text-sm font-semibold text-primary hover:underline">Memberships</Link>
      </AppHeader>

      {/* Breadcrumb */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 text-xs text-muted flex items-center gap-1.5">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span>/</span>
        <Link href="/courts" className="hover:text-primary">Venues</Link>
        <span>/</span>
        <Link href={`/courts?sport=${sport}`} className="hover:text-primary">{SPORT_LABELS[sport]}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{court.name}</span>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">✅ {success}</div>}

        {/* Photo gallery */}
        <FadeUp>
          <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden mb-6 h-64 sm:h-80">
            <div className="col-span-2 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-8xl">
              {emoji}
            </div>
            <div className="grid grid-rows-2 gap-2">
              <div className="bg-primary/10 flex items-center justify-center text-4xl rounded-xl">{emoji}</div>
              <div className="bg-primary/15 flex items-center justify-center text-4xl rounded-xl relative">
                {emoji}
                <button className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
                  +12 photos
                </button>
              </div>
            </div>
          </div>
        </FadeUp>

        <div className="flex gap-8 items-start">
          {/* ── Left: Details ── */}
          <div className="flex-1 min-w-0">
            {/* Venue title */}
            <div className="mb-5">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{court.name}</h1>
                <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full mt-1">✓ Verified</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-primary-light text-primary text-xs font-bold px-3 py-1 rounded-full">{SPORT_LABELS[sport]}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted">
                <span>⭐ 4.8 (324 reviews)</span>
                <span>📍 {court.address}, {court.city}</span>
                <span className="text-green-600 font-semibold">● Open · 6:00 AM – 10:00 PM</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border flex gap-1 mb-6">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                    activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'Overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold mb-3">About</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {court.name} is a premium sports facility in {court.city} offering world-class courts for {SPORT_LABELS[sport]}. Equipped with professional-grade flooring, lighting, and all amenities to make your game experience exceptional.
                  </p>
                </div>
                {court.amenities.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">Amenities</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {court.amenities.map((a) => (
                        <div key={a} className="flex items-center gap-2 text-sm p-3 rounded-xl border border-border bg-card">
                          <span>{AMENITY_ICONS[a] ?? '✓'}</span>
                          <span className="font-medium">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="font-bold mb-3">Location</h3>
                  <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <p className="font-semibold text-sm">{court.address}</p>
                      <p className="text-xs text-muted">{court.city}</p>
                    </div>
                    <button className="ml-auto text-sm font-semibold text-primary hover:underline">Get Directions</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Book' && (
              <div>
                {/* Date picker */}
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm font-semibold text-muted">Date:</label>
                  <input type="date" value={date} min={todayString()} onChange={(e) => setDate(e.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary bg-background" />
                </div>
                {allSlots.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-2xl border border-border">
                    <span className="text-4xl">📅</span>
                    <p className="text-muted mt-3">No slots for {formatDate(date)}</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {allSlots.map((slot, i) => {
                      const booked = slot.isBooked || slot.isBlocked;
                      return (
                        <motion.div
                          key={slot.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`flex items-center justify-between rounded-xl border-2 p-3 transition-colors ${
                            booked
                              ? 'border-border bg-border/30 opacity-50 cursor-not-allowed'
                              : 'border-border bg-background hover:border-primary cursor-pointer'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-sm">{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</p>
                            <p className="text-primary font-bold text-base mt-0.5">{formatPrice(slot.price)}</p>
                          </div>
                          {booked ? (
                            <span className="text-xs font-bold text-muted bg-border/60 px-3 py-1.5 rounded-lg">Booked</span>
                          ) : (
                            <button
                              onClick={() => handleBook(slot.id)}
                              disabled={bookingSlotId === slot.id}
                              className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                            >
                              {bookingSlotId === slot.id ? '…' : 'Book'}
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Reviews' && (
              <div className="space-y-4">
                {[
                  { name: 'Rahul K.', rating: 5, date: '2 days ago', text: 'Excellent courts with great lighting. Booked twice this week already!' },
                  { name: 'Priya S.', rating: 4, date: '1 week ago', text: 'Clean facilities and friendly staff. The booking process via FitOra is super easy.' },
                  { name: 'Arun V.', rating: 5, date: '2 weeks ago', text: 'Best badminton facility in Kondapur. Premium flooring, fully AC. Highly recommend!' },
                ].map((r, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary text-sm font-bold">{r.name[0]}</div>
                      <div>
                        <p className="font-semibold text-sm">{r.name}</p>
                        <p className="text-xs text-muted">{r.date}</p>
                      </div>
                      <span className="ml-auto text-sm">{'⭐'.repeat(r.rating)}</span>
                    </div>
                    <p className="text-sm text-muted">{r.text}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Policies' && (
              <div className="space-y-3 text-sm text-muted">
                <p>✅ Free cancellation up to 24 hours before the slot</p>
                <p>✅ 50% refund for cancellations within 2–24 hours</p>
                <p>❌ No refund for cancellations within 2 hours</p>
                <p>⏰ Check-in must be done 10 minutes before slot time</p>
                <p>📵 No outside food/beverages on the court</p>
              </div>
            )}

            {/* Membership plans */}
            {plans.length > 0 && (
              <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                <h2 className="font-bold mb-1">Membership Plans</h2>
                <p className="text-sm text-muted mb-4">Members get 10% off every booking</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <div key={plan.id} className="rounded-xl border-2 border-border bg-background p-4 hover:border-primary transition-colors">
                      <h3 className="font-bold">{plan.name}</h3>
                      <p className="text-xs text-muted mt-1">{DURATION_LABELS[plan.duration]}</p>
                      <p className="text-xl font-extrabold text-primary mt-2">{formatPrice(plan.price)}</p>
                      <button onClick={() => handlePurchasePlan(plan.id)} disabled={purchasingPlanId === plan.id} className="w-full mt-3 border border-primary text-primary text-sm font-bold py-2 rounded-xl hover:bg-primary hover:text-white transition-colors disabled:opacity-50">
                        {purchasingPlanId === plan.id ? 'Processing…' : 'Buy Membership'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Sticky Booking Sidebar ── */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-[calc(var(--nav-height)+1.5rem)] rounded-2xl border border-border bg-card p-5 shadow-lg">
              <h2 className="font-bold text-lg mb-4">Book a Court</h2>

              {/* Date */}
              <div className="mb-4">
                <label className="text-xs font-bold text-muted uppercase tracking-wide block mb-2">Date</label>
                <input type="date" value={date} min={todayString()} onChange={(e) => setDate(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary bg-background" />
              </div>

              {/* Slot grid */}
              <div className="mb-5">
                <label className="text-xs font-bold text-muted uppercase tracking-wide block mb-2">Time Slot</label>
                <div className="grid grid-cols-3 gap-1.5 max-h-52 overflow-y-auto">
                  {allSlots.length === 0 ? (
                    <p className="col-span-3 text-center text-sm text-muted py-4">No slots available</p>
                  ) : allSlots.map((slot) => {
                    const booked = slot.isBooked || slot.isBlocked;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => !booked && handleBook(slot.id)}
                        disabled={booked || bookingSlotId === slot.id}
                        className={`text-xs font-bold py-2 rounded-lg border transition-colors ${
                          booked
                            ? 'bg-border/40 border-border text-muted cursor-not-allowed'
                            : 'border-border hover:border-primary hover:bg-primary-light hover:text-primary'
                        }`}
                      >
                        {formatTime(slot.startTime)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price summary */}
              <div className="border-t border-border pt-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Court fee</span>
                  <span className="font-semibold">From {formatPrice(allSlots.find((s) => !s.isBooked)?.price ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Convenience fee</span>
                  <span className="font-semibold">₹50</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('Book')}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors"
              >
                Proceed to Pay
              </button>
              <p className="text-center text-xs text-muted mt-2">🔒 Secured by Razorpay</p>
            </div>
          </aside>
        </div>
      </main>
    </PageShell>
  );
}
