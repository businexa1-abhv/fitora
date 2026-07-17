'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SPORT_LABELS, SportType, type AuthUser, type Court, type CourtSlot } from '@fitora/shared';
import {
  CalendarX2,
  CheckCircle2,
  ChevronDown,
  Loader2,
  LogIn,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { createBooking, getCourt, getCourts, getCourtSlots } from '@/lib/courts';
import { completePayment } from '@/lib/payments';
import { formatPrice, formatTime } from '@/components/app-header';
import { SPORT_EMOJI } from '@/lib/constants';

/* Warm widget palette (scoped — intentionally distinct from the app's green theme) */
const C = {
  surface: '#fff8f6',
  container: '#ffeae1',
  containerLow: '#fff1eb',
  border: '#e2bfb0',
  ink: '#261812',
  inkSoft: '#5a4136',
  rust: '#a04100',
  orange: '#ff6b00',
};

function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextSevenDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

const labelCls = 'text-[11px] font-bold uppercase tracking-[0.12em]';
const fieldCls =
  'w-full h-11 rounded-lg border bg-white px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#ff6b00]/25 focus:border-[#ff6b00] disabled:opacity-60';

export function BookingWidget({ courtId }: { courtId: string }) {
  const router = useRouter();

  const [court, setCourt] = useState<Court | null>(null);
  const [courtLoading, setCourtLoading] = useState(true);
  const [siblings, setSiblings] = useState<Court[]>([]);

  const days = useMemo(nextSevenDays, []);
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [slots, setSlots] = useState<CourtSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [players, setPlayers] = useState(2);

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ checkInCode?: string; discount?: number } | null>(null);

  const loginHref = `/login?next=${encodeURIComponent(`/widget/${courtId}`)}`;

  /* Auth state is read client-side only, to avoid hydration mismatch */
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      setGuestName(`${stored.firstName} ${stored.lastName}`.trim());
      setGuestEmail(stored.email);
    }
  }, []);

  useEffect(() => {
    setCourtLoading(true);
    setCourt(null);
    getCourt(courtId)
      .then((c) => {
        setCourt(c);
        return getCourts({ city: c.city })
          .then((page) => {
            const list = page.items.some((x) => x.id === c.id) ? page.items : [c, ...page.items];
            setSiblings(list);
          })
          .catch(() => setSiblings([c]));
      })
      .catch(() => setCourt(null))
      .finally(() => setCourtLoading(false));
  }, [courtId]);

  const refreshSlots = useCallback(() => {
    setSlotsLoading(true);
    return getCourtSlots(courtId, date)
      .then((list) => setSlots([...list].sort((a, b) => a.startTime.localeCompare(b.startTime))))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [courtId, date]);

  useEffect(() => {
    setSelectedSlotId(null);
    void refreshSlots();
  }, [refreshSlots]);

  const sport: SportType = (court?.sportType as SportType | null) ?? SportType.OTHER;
  const sportOptions = useMemo(() => {
    const set = new Set<string>();
    siblings.forEach((c) => c.sportType && set.add(String(c.sportType)));
    if (court?.sportType) set.add(String(court.sportType));
    return [...set];
  }, [siblings, court]);
  const courtOptions = useMemo(
    () => siblings.filter((c) => String(c.sportType) === String(sport)),
    [siblings, sport],
  );

  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;
  const maxPlayers = selectedSlot?.capacity ?? 10;
  const selectedDay = days.find((d) => toDateString(d) === date) ?? days[0];
  const monthLabel = selectedDay.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  function handleSportChange(next: string) {
    const target = siblings.find((c) => String(c.sportType) === next);
    if (target && target.id !== courtId) router.replace(`/widget/${target.id}`);
  }

  function handleCourtChange(id: string) {
    if (id !== courtId) router.replace(`/widget/${id}`);
  }

  async function handleConfirm() {
    if (!selectedSlot || !court) return;
    const token = getAccessToken();
    if (!token || !user) {
      router.push(loginHref);
      return;
    }

    setConfirming(true);
    setError('');
    try {
      const checkout = await createBooking(token, selectedSlot.id);
      const result = (await completePayment(
        token,
        checkout.payment,
        guestEmail || user.email,
        guestName || `${user.firstName} ${user.lastName}`,
        `Court booking — ${court.name}`,
      )) as { checkInCode?: string };
      setSuccess({ checkInCode: result?.checkInCode, discount: checkout.membershipDiscount });
      setSelectedSlotId(null);
      await refreshSlots();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Booking failed. Please try again.',
      );
    } finally {
      setConfirming(false);
    }
  }

  /* ---- Loading / not-found shells ---- */
  if (courtLoading) {
    return (
      <WidgetFrame>
        <div className="flex-1 space-y-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg" style={{ background: C.container }} />
            <div className="space-y-2">
              <div className="h-5 w-48 rounded" style={{ background: C.container }} />
              <div className="h-3 w-32 rounded" style={{ background: C.containerLow }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-11 rounded-lg" style={{ background: C.containerLow }} />
            <div className="h-11 rounded-lg" style={{ background: C.containerLow }} />
          </div>
          <div className="flex gap-3">
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className="h-20 w-[72px] rounded-xl"
                style={{ background: C.containerLow }}
              />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg" style={{ background: C.containerLow }} />
            ))}
          </div>
        </div>
        <div
          className="w-full md:w-[320px] rounded-xl h-64 animate-pulse"
          style={{ background: C.containerLow }}
        />
      </WidgetFrame>
    );
  }

  if (!court) {
    return (
      <WidgetFrame>
        <div className="flex-1 py-16 text-center space-y-3">
          <CalendarX2 className="mx-auto w-10 h-10" style={{ color: C.rust }} />
          <p className="font-bold" style={{ color: C.ink }}>
            This venue is unavailable
          </p>
          <p className="text-sm" style={{ color: C.inkSoft }}>
            The court may have been removed or the link is incorrect.
          </p>
          <Link
            href="/courts"
            className="inline-block text-sm font-semibold hover:underline"
            style={{ color: C.rust }}
          >
            Browse venues on Fitora
          </Link>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame>
      {/* ---- Left column: booking flow ---- */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Venue identity */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-12 h-12 shrink-0 rounded-lg flex items-center justify-center text-2xl shadow-sm"
              style={{ background: C.orange }}
              aria-hidden
            >
              {SPORT_EMOJI[sport] ?? '🏟️'}
            </div>
            <div className="min-w-0">
              <h1
                className="text-xl font-extrabold leading-tight truncate"
                style={{ color: C.ink }}
              >
                {court.name}
              </h1>
              <p className="text-sm flex items-center gap-1 truncate" style={{ color: C.inkSoft }}>
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {court.address}, {court.city}
              </p>
            </div>
          </div>
          {user ? (
            <p className="text-xs font-semibold shrink-0 text-right" style={{ color: C.inkSoft }}>
              Signed in as
              <span className="block" style={{ color: C.rust }}>
                {user.firstName}
              </span>
            </p>
          ) : (
            <Link
              href={loginHref}
              className="shrink-0 inline-flex items-center gap-1 text-sm font-bold hover:underline"
              style={{ color: C.rust }}
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
          )}
        </header>

        {/* Sport & court selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="widget-sport" className={labelCls} style={{ color: C.inkSoft }}>
              Select sport
            </label>
            <div className="relative">
              <select
                id="widget-sport"
                value={String(sport)}
                onChange={(e) => handleSportChange(e.target.value)}
                className={`${fieldCls} appearance-none pr-9`}
                style={{ borderColor: C.border, color: C.ink, background: C.containerLow }}
              >
                {sportOptions.map((s) => (
                  <option key={s} value={s}>
                    {SPORT_LABELS[s as SportType] ?? s}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-4 h-4 absolute right-3 top-3.5 pointer-events-none"
                style={{ color: C.inkSoft }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="widget-court" className={labelCls} style={{ color: C.inkSoft }}>
              Court selection
            </label>
            <div className="relative">
              <select
                id="widget-court"
                value={courtId}
                onChange={(e) => handleCourtChange(e.target.value)}
                className={`${fieldCls} appearance-none pr-9`}
                style={{ borderColor: C.border, color: C.ink, background: C.containerLow }}
              >
                {courtOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-4 h-4 absolute right-3 top-3.5 pointer-events-none"
                style={{ color: C.inkSoft }}
              />
            </div>
          </div>
        </div>

        {/* Date carousel */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={labelCls} style={{ color: C.ink }}>
              Select date
            </h2>
            <span className="text-xs font-semibold" style={{ color: C.rust }}>
              {monthLabel}
            </span>
          </div>
          <div
            className="flex gap-3 overflow-x-auto pb-2 widget-scrollbar"
            role="listbox"
            aria-label="Booking date"
          >
            {days.map((d) => {
              const value = toDateString(d);
              const active = value === date;
              return (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setDate(value)}
                  className="min-w-[72px] h-20 flex flex-col items-center justify-center gap-0.5 rounded-xl border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#ff6b00] outline-none active:scale-95"
                  style={
                    active
                      ? { background: C.orange, borderColor: C.orange, color: '#fff' }
                      : { borderColor: C.border, color: C.ink, background: '#fff' }
                  }
                >
                  <span
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ opacity: active ? 0.9 : 0.55 }}
                  >
                    {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                  <span className="text-xl font-extrabold leading-none">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Slots */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={labelCls} style={{ color: C.ink }}>
              Available slots
            </h2>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ background: C.orange }}
              />
              Live availability
            </span>
          </div>

          {slotsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[52px] rounded-lg"
                  style={{ background: C.containerLow }}
                />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div
              className="rounded-lg border border-dashed py-8 text-center text-sm"
              style={{ borderColor: C.border, color: C.inkSoft }}
            >
              No slots published for{' '}
              {selectedDay.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
              . Try another date.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const unavailable = slot.isBooked || slot.isBlocked;
                const selected = slot.id === selectedSlotId;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={unavailable}
                    aria-pressed={selected}
                    onClick={() => setSelectedSlotId(selected ? null : slot.id)}
                    className="py-2 px-1 rounded-lg border text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] disabled:cursor-not-allowed active:scale-95"
                    style={
                      selected
                        ? { background: C.rust, borderColor: C.rust, color: '#fff' }
                        : unavailable
                          ? {
                              background: C.container,
                              borderColor: C.border,
                              color: C.inkSoft,
                              opacity: 0.45,
                            }
                          : { background: '#fff', borderColor: C.border, color: C.ink }
                    }
                  >
                    <span className="block text-sm font-bold">{formatTime(slot.startTime)}</span>
                    <span className="block text-[11px]" style={{ opacity: selected ? 0.9 : 0.6 }}>
                      {unavailable
                        ? slot.isBlocked
                          ? 'Blocked'
                          : 'Booked'
                        : formatPrice(slot.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Guest information */}
        <section className="space-y-3 pt-4 border-t" style={{ borderColor: C.border }}>
          <h2 className={labelCls} style={{ color: C.ink }}>
            Guest information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="widget-name" className={labelCls} style={{ color: C.inkSoft }}>
                Full name
              </label>
              <input
                id="widget-name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className={fieldCls}
                style={{ borderColor: C.border, color: C.ink }}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="widget-email" className={labelCls} style={{ color: C.inkSoft }}>
                Email address
              </label>
              <input
                id="widget-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className={fieldCls}
                style={{ borderColor: C.border, color: C.ink }}
              />
            </div>
          </div>
          {!user && (
            <p className="text-xs" style={{ color: C.inkSoft }}>
              You&apos;ll be asked to sign in to your Fitora account when confirming — your
              selection is kept.
            </p>
          )}
        </section>
      </div>

      {/* ---- Right column: summary & payment rail ---- */}
      <aside
        className="w-full md:w-[320px] shrink-0 rounded-xl p-5 flex flex-col gap-4 md:sticky md:top-4 h-fit"
        style={{ background: C.containerLow }}
      >
        <h2 className="text-lg font-extrabold" style={{ color: C.ink }}>
          Booking summary
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <p className="font-bold truncate" style={{ color: C.ink }}>
                {SPORT_LABELS[sport]} — {court.name}
              </p>
              <p className="text-xs" style={{ color: C.inkSoft }}>
                {selectedDay.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                {selectedSlot
                  ? ` • ${formatTime(selectedSlot.startTime)} – ${formatTime(selectedSlot.endTime)}`
                  : ' • Pick a time slot'}
              </p>
            </div>
            <span className="font-bold shrink-0" style={{ color: C.ink }}>
              {selectedSlot ? formatPrice(selectedSlot.price) : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: C.inkSoft }}>Service fee</span>
            <span className="font-bold" style={{ color: C.ink }}>
              ₹0
            </span>
          </div>
          <p className="text-[11px] leading-snug" style={{ color: C.inkSoft }}>
            No hidden charges — you pay exactly the slot price shown above.
          </p>
        </div>

        <div
          className="border-t pt-3 flex justify-between items-center"
          style={{ borderColor: C.border }}
        >
          <span className="text-lg font-extrabold" style={{ color: C.rust }}>
            Total
          </span>
          <span className="text-lg font-extrabold" style={{ color: C.orange }}>
            {selectedSlot ? formatPrice(selectedSlot.price) : '—'}
          </span>
        </div>

        {/* Player count (informational — pricing is per slot) */}
        <div
          className="flex items-center justify-between rounded-lg border bg-white px-3 py-2.5"
          style={{ borderColor: C.border }}
        >
          <span className="flex items-center gap-2 text-sm font-bold" style={{ color: C.ink }}>
            <Users className="w-4 h-4" style={{ color: C.rust }} />
            Players
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Fewer players"
              onClick={() => setPlayers((p) => Math.max(1, p - 1))}
              disabled={players <= 1}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:brightness-95 disabled:opacity-40"
              style={{ background: C.container, color: C.ink }}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-bold w-4 text-center" style={{ color: C.ink }}>
              {players}
            </span>
            <button
              type="button"
              aria-label="More players"
              onClick={() => setPlayers((p) => Math.min(maxPlayers, p + 1))}
              disabled={players >= maxPlayers}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:brightness-95 disabled:opacity-40"
              style={{ background: C.container, color: C.ink }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="space-y-3 mt-auto">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || confirming}
            className="w-full py-3.5 rounded-lg text-base font-extrabold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 inline-flex items-center justify-center gap-2"
            style={{ background: C.orange }}
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : user ? (
              'Confirm & Pay'
            ) : (
              'Sign in to book'
            )}
          </button>
          <p className="text-center text-[11px]" style={{ color: C.inkSoft }}>
            By booking, you agree to Fitora&apos;s{' '}
            <Link href="/" className="underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>

        <p
          className="flex justify-center items-center gap-1.5 text-[11px] opacity-70"
          style={{ color: C.ink }}
        >
          <ShieldCheck className="w-4 h-4" />
          Secure Razorpay payment
        </p>
      </aside>

      {/* ---- Success overlay ---- */}
      {success && (
        <div
          className="absolute inset-0 z-10 rounded-xl flex items-center justify-center p-6 animate-fade-in"
          style={{ background: 'rgba(38, 24, 18, 0.72)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-label="Booking confirmed"
        >
          <div
            className="max-w-sm w-full rounded-2xl p-8 text-center space-y-5"
            style={{ background: C.surface }}
          >
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white"
              style={{ background: C.orange }}
            >
              <CheckCircle2 className="w-11 h-11" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold" style={{ color: C.ink }}>
                Booking confirmed!
              </h2>
              {success.checkInCode && (
                <p className="text-sm" style={{ color: C.inkSoft }}>
                  Check-in code:{' '}
                  <span className="font-mono font-bold text-base" style={{ color: C.rust }}>
                    {success.checkInCode}
                  </span>
                </p>
              )}
              {typeof success.discount === 'number' && success.discount > 0 && (
                <p className="text-xs font-semibold" style={{ color: C.rust }}>
                  {Math.round(success.discount * 100)}% member discount applied
                </p>
              )}
              <p className="text-sm" style={{ color: C.inkSoft }}>
                Your court is ready — we&apos;ve refreshed the schedule below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="w-full py-3 rounded-xl border-2 font-bold transition-colors hover:bg-white"
              style={{ borderColor: C.orange, color: C.rust }}
            >
              Book another slot
            </button>
          </div>
        </div>
      )}
    </WidgetFrame>
  );
}

function WidgetFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full max-w-[1024px] mx-auto rounded-xl border shadow-lg p-4 lg:p-6 flex flex-col md:flex-row gap-6"
      style={{ background: C.surface, borderColor: C.border }}
    >
      {children}
      <style>{`
        .widget-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .widget-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .widget-scrollbar::-webkit-scrollbar-thumb {
          background: ${C.border};
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
