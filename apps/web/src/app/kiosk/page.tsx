'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarClock,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Grid3x3,
  Info,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { BookingStatus } from '@fitora/shared';
import { ApiError } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { getCourtBookings, getMyCourts } from '@/lib/courts';
import { checkInBooking, parseCheckInPayload, type OwnerBookingRow } from '@/lib/owner-bookings';
import { isCourtOwner } from '@/lib/owner-utils';

type KioskBooking = OwnerBookingRow & {
  courtId?: string;
  checkedInAt?: string | null;
};

type ModalState =
  | { kind: 'none' }
  | { kind: 'manual'; bookingId?: string; guestName?: string }
  | { kind: 'search' }
  | { kind: 'success'; booking: KioskBooking; guestName: string }
  | { kind: 'error'; message: string };

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

const VENUE_KEY = 'fitora_kiosk_venue_id';
const SUCCESS_RESET_MS = 6000;

function guestName(b: KioskBooking) {
  const name = `${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim();
  return name || 'Guest';
}

function isSameDay(iso: string, day: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

function formatClock(date: Date) {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDateLabel(date: Date) {
  return date
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();
}

function formatSlotRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
  return `${new Date(start).toLocaleTimeString('en-IN', opts)} – ${new Date(end).toLocaleTimeString('en-IN', opts)}`;
}

function slotDurationMins(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function timeParts(iso: string) {
  const d = new Date(iso);
  return {
    hh: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
  };
}

export default function KioskPage() {
  const queryClient = useQueryClient();
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [manualCode, setManualCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [staffOpen, setStaffOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [resetCountdown, setResetCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLock = useRef(false);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = getAccessToken();
    const user = getStoredUser();
    setToken(t);
    setAuthorized(!!t && isCourtOwner(user));
    setAuthReady(true);
    try {
      const saved = sessionStorage.getItem(VENUE_KEY);
      if (saved) setSelectedCourtId(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const courtsQuery = useQuery({
    queryKey: ['kiosk', 'courts'],
    queryFn: () => getMyCourts(token!),
    enabled: !!token && authorized,
  });

  useEffect(() => {
    const courts = courtsQuery.data;
    if (!courts?.length) return;
    if (selectedCourtId && courts.some((c) => c.id === selectedCourtId)) return;
    const first = courts[0];
    setSelectedCourtId(first.id);
    try {
      sessionStorage.setItem(VENUE_KEY, first.id);
    } catch {
      // ignore
    }
  }, [courtsQuery.data, selectedCourtId]);

  const selectedCourt = useMemo(
    () => courtsQuery.data?.find((c) => c.id === selectedCourtId) ?? null,
    [courtsQuery.data, selectedCourtId],
  );

  const bookingsQuery = useQuery({
    queryKey: ['kiosk', 'bookings', selectedCourtId],
    queryFn: async () => {
      const rows = await getCourtBookings(token!, selectedCourtId!);
      return rows as unknown as KioskBooking[];
    },
    enabled: !!token && authorized && !!selectedCourtId,
    refetchInterval: 30_000,
  });

  const todayBookings = useMemo(() => {
    const items = bookingsQuery.data ?? [];
    return items
      .filter((b) => b.slot?.startTime && isSameDay(b.slot.startTime, now))
      .sort((a, b) => new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime());
  }, [bookingsQuery.data, now]);

  const upcoming = useMemo(() => {
    const t = now.getTime();
    return todayBookings.filter(
      (b) =>
        b.status === BookingStatus.CONFIRMED &&
        !b.checkedInAt &&
        new Date(b.slot.endTime).getTime() >= t - 15 * 60_000,
    );
  }, [todayBookings, now]);

  const checkedInCount = useMemo(
    () => todayBookings.filter((b) => b.checkedInAt || b.status === BookingStatus.COMPLETED).length,
    [todayBookings],
  );

  const dailyTotal = Math.max(todayBookings.length, 1);
  const volumePct = Math.min(100, Math.round((checkedInCount / dailyTotal) * 100));

  const facilityAlert = useMemo(() => {
    const next = upcoming[0];
    if (!next) {
      return {
        title: 'Facility Status',
        message: 'No more confirmed arrivals scheduled for today.',
      };
    }
    const mins = Math.round((new Date(next.slot.startTime).getTime() - now.getTime()) / 60000);
    if (mins <= 0) {
      return {
        title: 'Arrivals Now',
        message: `${guestName(next)} is due on ${next.court?.name ?? 'court'} — ready for check-in.`,
      };
    }
    return {
      title: 'Next Arrival',
      message: `${guestName(next)} at ${timeParts(next.slot.startTime).hh}:${timeParts(next.slot.startTime).mm} · ${next.court?.name ?? 'Court'}.`,
    };
  }, [upcoming, now]);

  const clearSuccessTimers = useCallback(() => {
    if (successTimer.current) clearTimeout(successTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    successTimer.current = null;
    countdownTimer.current = null;
    setResetCountdown(null);
  }, []);

  const resetKiosk = useCallback(() => {
    clearSuccessTimers();
    setModal({ kind: 'none' });
    setManualCode('');
    setSearchQuery('');
    setStaffOpen(false);
    scanLock.current = false;
  }, [clearSuccessTimers]);

  const showSuccess = useCallback(
    (booking: KioskBooking) => {
      clearSuccessTimers();
      setModal({ kind: 'success', booking, guestName: guestName(booking) });
      setResetCountdown(Math.ceil(SUCCESS_RESET_MS / 1000));
      countdownTimer.current = setInterval(() => {
        setResetCountdown((n) => (n == null || n <= 1 ? 0 : n - 1));
      }, 1000);
      successTimer.current = setTimeout(() => {
        resetKiosk();
      }, SUCCESS_RESET_MS);
    },
    [clearSuccessTimers, resetKiosk],
  );

  const checkInMutation = useMutation({
    mutationFn: async ({ bookingId, checkInCode }: { bookingId: string; checkInCode: string }) => {
      if (!token) throw new Error('Not signed in');
      return checkInBooking(token, bookingId, checkInCode);
    },
    onSuccess: (result, vars) => {
      const fromList = (bookingsQuery.data ?? []).find((b) => b.id === vars.bookingId);
      const booking = (result.booking as KioskBooking) ?? fromList;
      void queryClient.invalidateQueries({ queryKey: ['kiosk', 'bookings'] });
      if (booking) {
        showSuccess({ ...fromList, ...booking } as KioskBooking);
      } else {
        setModal({
          kind: 'error',
          message: 'Check-in succeeded, but booking details could not be loaded.',
        });
      }
      scanLock.current = false;
    },
    onError: (err: Error) => {
      scanLock.current = false;
      setModal({
        kind: 'error',
        message: err instanceof ApiError ? err.message : err.message || 'Check-in failed',
      });
    },
  });

  const resolveAndCheckIn = useCallback(
    (payload: ReturnType<typeof parseCheckInPayload>) => {
      if (!payload || scanLock.current || checkInMutation.isPending) return;

      if ('bookingId' in payload && payload.bookingId) {
        scanLock.current = true;
        checkInMutation.mutate({
          bookingId: payload.bookingId,
          checkInCode: payload.checkInCode,
        });
        return;
      }

      const code = payload.checkInCode.toUpperCase();
      const matches = todayBookings.filter(
        (b) =>
          b.checkInCode?.toUpperCase() === code &&
          b.status === BookingStatus.CONFIRMED &&
          !b.checkedInAt,
      );

      if (matches.length === 1) {
        scanLock.current = true;
        checkInMutation.mutate({ bookingId: matches[0].id, checkInCode: code });
        return;
      }

      if (matches.length === 0) {
        setModal({
          kind: 'error',
          message:
            'This code does not match any confirmed booking for today. Search and select a booking, then enter the code.',
        });
        return;
      }

      setManualCode(code);
      setModal({ kind: 'search' });
    },
    [checkInMutation, todayBookings],
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not available on this device. Use Manual Entry.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      setCameraActive(true);

      const BD = (
        window as unknown as {
          BarcodeDetector?: new (opts?: { formats: string[] }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;
      if (BD) {
        try {
          detectorRef.current = new BD({ formats: ['qr_code'] });
        } catch {
          detectorRef.current = null;
        }
      }
    } catch {
      setCameraError('Camera permission denied or unavailable. Use Manual Entry.');
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (!authorized || !authReady) return;
    void startCamera();
    return () => stopCamera();
  }, [authorized, authReady, startCamera, stopCamera]);

  useEffect(() => {
    if (!cameraActive || modal.kind === 'success') return;
    let cancelled = false;
    let raf = 0;

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (
        video &&
        detector &&
        video.readyState >= 2 &&
        !scanLock.current &&
        !checkInMutation.isPending &&
        modal.kind === 'none'
      ) {
        try {
          const codes = await detector.detect(video);
          const raw = codes[0]?.rawValue;
          if (raw) {
            const parsed = parseCheckInPayload(raw);
            if (parsed) resolveAndCheckIn(parsed);
          }
        } catch {
          // BarcodeDetector can throw transiently — ignore
        }
      }
      raf = requestAnimationFrame(() => {
        void tick();
      });
    };

    raf = requestAnimationFrame(() => {
      void tick();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [cameraActive, modal.kind, checkInMutation.isPending, resolveAndCheckIn]);

  const submitManual = () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;

    if (modal.kind === 'manual' && modal.bookingId) {
      scanLock.current = true;
      checkInMutation.mutate({ bookingId: modal.bookingId, checkInCode: code });
      return;
    }

    resolveAndCheckIn({ checkInCode: code });
  };

  const typeNum = (n: string) => {
    setManualCode((prev) => (prev.length >= 12 ? prev : prev + n));
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const pool = todayBookings.filter(
      (b) => b.status === BookingStatus.CONFIRMED && !b.checkedInAt,
    );
    if (!q) return pool;
    return pool.filter((b) => {
      const name = guestName(b).toLowerCase();
      const court = (b.court?.name ?? '').toLowerCase();
      const id = b.id.toLowerCase();
      const code = (b.checkInCode ?? '').toLowerCase();
      return name.includes(q) || court.includes(q) || id.includes(q) || code.includes(q);
    });
  }, [todayBookings, searchQuery]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff6f1]">
        <Loader2 className="h-10 w-10 animate-spin text-[#a04100]" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top_right,#ffdbcc_0%,#fff6f1_55%)] px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#a04100] text-white shadow-lg">
          <Dumbbell className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-[#261812]">FitOra Kiosk Setup</h1>
        <p className="mt-3 max-w-md text-lg text-[#5a4136]">
          Sign in with a court owner or admin account to unlock venue bookings and check-in.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-[#ff6b00] px-10 text-lg font-bold text-white shadow-md transition active:scale-95"
        >
          Sign in to continue
        </Link>
        <p className="mt-4 text-sm text-[#8e7164]">
          After signing in, open <span className="font-mono font-semibold">/kiosk</span> on this
          tablet.
        </p>
      </div>
    );
  }

  if (courtsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff6f1]">
        <Loader2 className="h-10 w-10 animate-spin text-[#a04100]" />
      </div>
    );
  }

  if (!courtsQuery.data?.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fff6f1] px-6 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-[#a04100]" />
        <h1 className="text-2xl font-bold text-[#261812]">No venues found</h1>
        <p className="mt-2 max-w-md text-[#5a4136]">
          This account has no courts yet. Add a court in the owner dashboard, then return to the
          kiosk.
        </p>
        <Link
          href="/owner/courts"
          className="mt-6 rounded-2xl bg-[#565e74] px-8 py-3 font-bold text-white"
        >
          Open owner courts
        </Link>
      </div>
    );
  }

  return (
    <div className="kiosk-root flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_right,#ffdbcc_0%,#fff6f1_60%)] text-[#261812]">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-4 md:px-10 md:py-5">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#a04100] text-white shadow-md">
            <Dumbbell className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">
              <span className="text-[#a04100]">FitOra</span> Kiosk
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5a4136] md:text-sm">
              <label className="sr-only" htmlFor="kiosk-venue">
                Venue
              </label>
              <select
                id="kiosk-venue"
                className="max-w-[220px] cursor-pointer rounded-lg border border-[#e2bfb0] bg-white/80 px-2 py-1 font-semibold text-[#261812] outline-none focus:border-[#ff6b00] md:max-w-xs"
                value={selectedCourtId ?? ''}
                onChange={(e) => {
                  setSelectedCourtId(e.target.value);
                  try {
                    sessionStorage.setItem(VENUE_KEY, e.target.value);
                  } catch {
                    // ignore
                  }
                }}
              >
                {courtsQuery.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="hidden text-[#8e7164] sm:inline">
                · Venue ID: #{(selectedCourtId ?? '').slice(0, 6).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-8">
          <div className="text-right">
            <p className="text-2xl font-extrabold tabular-nums md:text-3xl">{formatClock(now)}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5a4136] md:text-xs">
              {formatDateLabel(now)}
            </p>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label="Staff controls"
              onClick={() => setStaffOpen((o) => !o)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffeae1] text-[#5a4136] transition hover:bg-[#fee3d8] active:scale-95 md:h-14 md:w-14"
            >
              <Settings2 className="h-6 w-6" />
            </button>
            {staffOpen && (
              <div className="absolute right-0 top-16 z-40 w-64 rounded-3xl border border-[#ff6b00]/40 bg-white/95 p-4 shadow-2xl backdrop-blur">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#a04100]">
                  Staff override
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetKiosk();
                      void bookingsQuery.refetch();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl bg-[#ffeae1] px-3 py-2.5 text-left text-sm font-semibold"
                  >
                    <RefreshCw className="h-4 w-4" /> Reset terminal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      void startCamera();
                      setStaffOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl bg-[#ffeae1] px-3 py-2.5 text-left text-sm font-semibold"
                  >
                    <Camera className="h-4 w-4" /> Restart camera
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-5 px-4 pb-6 md:grid-cols-12 md:grid-rows-6 md:gap-6 md:px-10 md:pb-8">
        {/* Scan card */}
        <section className="relative flex flex-col overflow-hidden rounded-[28px] border border-white/40 bg-white/85 shadow-lg backdrop-blur-md md:col-span-7 md:row-span-4 md:rounded-[32px]">
          <div className="pointer-events-none absolute inset-0 animate-[shimmer_2s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,107,0,0.08),transparent)] bg-[length:200%_100%] opacity-40" />
          <div className="relative flex flex-grow flex-col items-center justify-center px-6 py-8 text-center md:px-10">
            <div className="relative mb-6 h-56 w-56 md:h-72 md:w-72">
              <div className="absolute inset-0 rounded-[40px] border-4 border-[#a04100]/20" />
              <div className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-xl border-l-8 border-t-8 border-[#a04100]" />
              <div className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-xl border-r-8 border-t-8 border-[#a04100]" />
              <div className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-xl border-b-8 border-l-8 border-[#a04100]" />
              <div className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-xl border-b-8 border-r-8 border-[#a04100]" />
              {cameraActive && (
                <div className="absolute left-10 right-10 top-0 z-10 h-1 animate-[kiosk-scan_2s_linear_infinite] bg-[#ff6b00] shadow-[0_0_15px_rgba(255,107,0,0.8)]" />
              )}
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[40px] bg-[#efd5ca]">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                    aria-label="QR scanner camera preview"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4">
                    {cameraError ? (
                      <CameraOff className="h-16 w-16 text-[#5a4136]/40" />
                    ) : (
                      <QrCode className="h-24 w-24 text-[#5a4136]/25 md:h-28 md:w-28" />
                    )}
                  </div>
                )}
              </div>
            </div>
            <h2 className="text-2xl font-extrabold md:text-3xl">Scan Your QR Code</h2>
            <p className="mt-2 max-w-md text-base text-[#5a4136] md:text-lg">
              {cameraError
                ? cameraError
                : 'Position your booking confirmation QR code within the frame for instant check-in.'}
            </p>
            {checkInMutation.isPending && (
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#a04100]">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking in…
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 border-t border-[#e2bfb0] bg-[#fee3d8]/50 p-4 md:p-6">
            <button
              type="button"
              onClick={() => {
                setManualCode('');
                setModal({ kind: 'manual' });
              }}
              className="flex min-h-[56px] items-center gap-3 rounded-full border border-[#8e7164] bg-white px-8 py-3 text-lg font-bold transition hover:border-[#ff6b00] hover:bg-[#ff6b00] hover:text-white active:scale-95 md:min-h-[64px] md:px-10 md:text-xl"
            >
              <Grid3x3 className="h-6 w-6" />
              Manual Entry
            </button>
          </div>
        </section>

        {/* Upcoming rail */}
        <aside className="flex flex-col rounded-[28px] border border-white/40 bg-white/85 p-5 shadow-sm backdrop-blur-md md:col-span-5 md:row-span-6 md:rounded-[32px] md:p-8">
          <div className="mb-4 flex items-center justify-between gap-2 md:mb-6">
            <h3 className="flex items-center gap-2 text-lg font-bold md:text-2xl">
              <CalendarClock className="h-6 w-6 text-[#a04100]" />
              Upcoming Today
            </h3>
            <span className="rounded-full bg-[#ff6b00] px-3 py-1 text-xs font-bold text-[#572000] md:text-sm">
              {upcoming.length} Left
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {bookingsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#a04100]" />
              </div>
            ) : bookingsQuery.isError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Could not load bookings.{' '}
                <button
                  type="button"
                  className="font-bold underline"
                  onClick={() => void bookingsQuery.refetch()}
                >
                  Retry
                </button>
              </div>
            ) : upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#e2bfb0] bg-white/60 p-8 text-center">
                <p className="font-semibold">No upcoming check-ins</p>
                <p className="mt-1 text-sm text-[#5a4136]">
                  Confirmed bookings for today will appear here.
                </p>
              </div>
            ) : (
              upcoming.slice(0, 12).map((b, i) => {
                const { hh, mm } = timeParts(b.slot.startTime);
                const mins = slotDurationMins(b.slot.startTime, b.slot.endTime);
                const readySoon =
                  new Date(b.slot.startTime).getTime() - now.getTime() <= 30 * 60_000;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setManualCode('');
                      setModal({
                        kind: 'manual',
                        bookingId: b.id,
                        guestName: guestName(b),
                      });
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border border-[#e2bfb0] bg-white p-3 text-left transition hover:border-[#a04100] ${
                      i >= 2 ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-[#e2bfb0] bg-[#fff1eb] md:h-16 md:w-16">
                      <span className="text-xl font-extrabold leading-none md:text-2xl">{hh}</span>
                      <span className="text-[10px] font-bold uppercase text-[#5a4136]">{mm}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold md:text-lg">{guestName(b)}</p>
                      <p className="truncate text-xs font-medium text-[#5a4136] md:text-sm">
                        {b.court?.name ?? selectedCourt?.name} · {mins} min Session
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-[#8e7164]">
                        {b.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    {readySoon ? (
                      <span className="shrink-0 rounded-lg bg-[#dae2fd] px-2 py-1 text-[10px] font-bold uppercase text-[#3f465c]">
                        Ready
                      </span>
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#8e7164]" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setModal({ kind: 'search' });
            }}
            className="mt-4 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#565e74] py-3 text-base font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
          >
            <Search className="h-5 w-5" />
            Search All Bookings
          </button>
        </aside>

        {/* Daily volume */}
        <section className="flex flex-col justify-center rounded-[28px] border border-white/40 bg-white/85 p-6 shadow-sm backdrop-blur-md md:col-span-3 md:row-span-2 md:rounded-[32px] md:p-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5a4136]">
            Daily Volume
          </p>
          <div className="flex items-baseline gap-1">
            <h4 className="text-4xl font-extrabold text-[#a04100] md:text-5xl">{checkedInCount}</h4>
            <p className="text-xl font-bold text-[#5a4136]">/ {todayBookings.length}</p>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-[#f8ddd2]">
            <div
              className="h-2 rounded-full bg-[#a04100] transition-all"
              style={{ width: `${volumePct}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-[#5a4136] md:text-sm">
            {volumePct}% of today&apos;s bookings checked in
          </p>
        </section>

        {/* Facility alert */}
        <section className="relative flex items-center gap-4 overflow-hidden rounded-[28px] border border-[#e2bfb0] bg-white p-5 shadow-sm md:col-span-4 md:row-span-2 md:gap-6 md:rounded-[32px] md:p-8">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#8a9ab2] text-[#223246] md:h-16 md:w-16">
            <Info className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h4 className="text-lg font-bold md:text-xl">{facilityAlert.title}</h4>
            <p className="mt-1 text-sm text-[#5a4136] md:text-base">{facilityAlert.message}</p>
          </div>
        </section>
      </main>

      {/* Modals */}
      {modal.kind !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[#3d2d26]/80 backdrop-blur-md"
            onClick={() => {
              if (modal.kind !== 'success') resetKiosk();
            }}
          />

          {modal.kind === 'success' && (
            <div className="relative w-full max-w-2xl rounded-[40px] bg-white/95 p-8 text-center shadow-2xl md:rounded-[48px] md:p-10">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-[0_0_40px_rgba(34,197,94,0.4)] md:h-32 md:w-32">
                <CheckCircle2 className="h-14 w-14 text-white md:h-20 md:w-20" />
              </div>
              <h2 className="text-3xl font-extrabold leading-tight md:text-5xl">
                Welcome, {modal.guestName.split(' ')[0]}!
              </h2>
              <p className="mt-3 text-lg text-[#5a4136] md:text-xl">
                Your booking is confirmed for{' '}
                <span className="font-bold text-[#261812]">
                  {modal.booking.court?.name ?? selectedCourt?.name ?? 'court'}
                </span>
                .
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-[#fff1eb] p-5 text-left">
                  <p className="text-xs font-bold uppercase text-[#5a4136]">Session Time</p>
                  <p className="mt-1 text-lg font-bold">
                    {formatSlotRange(modal.booking.slot.startTime, modal.booking.slot.endTime)}
                  </p>
                </div>
                <div className="rounded-3xl bg-[#fff1eb] p-5 text-left">
                  <p className="text-xs font-bold uppercase text-[#5a4136]">Booking</p>
                  <p className="mt-1 font-mono text-lg font-bold">
                    {modal.booking.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <p className="mt-6 text-base italic text-[#5a4136]">
                Auto-resetting in {resetCountdown ?? 0} seconds…
              </p>
              <button
                type="button"
                onClick={resetKiosk}
                className="mt-4 w-full rounded-3xl bg-[#a04100] py-4 text-xl font-bold text-white active:scale-95"
              >
                OK, Let&apos;s Go!
              </button>
            </div>
          )}

          {modal.kind === 'error' && (
            <div className="relative w-full max-w-lg rounded-[40px] bg-white/95 p-8 text-center shadow-2xl md:p-10">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#ba1a1a]">
                <AlertCircle className="h-14 w-14 text-white" />
              </div>
              <h2 className="text-3xl font-extrabold">Check-in failed</h2>
              <p className="mt-3 text-lg text-[#5a4136]">{modal.message}</p>
              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={resetKiosk}
                  className="w-full rounded-2xl bg-[#f8ddd2] py-4 font-bold"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualCode('');
                    setModal({ kind: 'search' });
                  }}
                  className="w-full rounded-2xl bg-[#565e74] py-4 font-bold text-white"
                >
                  Search Bookings
                </button>
              </div>
            </div>
          )}

          {modal.kind === 'manual' && (
            <div className="relative w-full max-w-xl rounded-[40px] bg-white/95 p-6 shadow-2xl md:rounded-[48px] md:p-8">
              <h2 className="mb-2 text-center text-2xl font-extrabold md:text-3xl">
                {modal.bookingId ? 'Enter Check-in Code' : 'Enter Check-in Code'}
              </h2>
              {modal.guestName && (
                <p className="mb-4 text-center text-sm font-semibold text-[#5a4136]">
                  For {modal.guestName}
                </p>
              )}
              {!modal.bookingId && (
                <p className="mb-4 text-center text-sm text-[#5a4136]">
                  We&apos;ll match the code to today&apos;s bookings. Or{' '}
                  <button
                    type="button"
                    className="font-bold text-[#a04100] underline"
                    onClick={() => setModal({ kind: 'search' })}
                  >
                    search first
                  </button>
                  .
                </p>
              )}
              <div className="mb-4 rounded-2xl bg-[#f8ddd2] p-4">
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  placeholder="CODE"
                  className="w-full bg-transparent text-center text-3xl font-extrabold tracking-[0.3em] outline-none placeholder:text-[#8e7164] md:text-4xl"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitManual();
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => typeNum(n)}
                    className="flex h-16 items-center justify-center rounded-2xl border border-[#e2bfb0] bg-white text-2xl font-bold active:scale-95 active:bg-[#ffdbcc] md:h-20"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setManualCode((p) => p.slice(0, -1))}
                  className="flex h-16 items-center justify-center rounded-2xl bg-[#ffdad6] text-[#ba1a1a] active:scale-95 md:h-20"
                  aria-label="Backspace"
                >
                  ⌫
                </button>
                <button
                  type="button"
                  onClick={() => typeNum('0')}
                  className="flex h-16 items-center justify-center rounded-2xl border border-[#e2bfb0] bg-white text-2xl font-bold active:scale-95 md:h-20"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={submitManual}
                  disabled={checkInMutation.isPending || !manualCode.trim()}
                  className="flex h-16 items-center justify-center rounded-2xl bg-[#a04100] text-2xl font-bold text-white active:scale-95 disabled:opacity-50 md:h-20"
                  aria-label="Submit"
                >
                  {checkInMutation.isPending ? <Loader2 className="h-7 w-7 animate-spin" /> : '→'}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('').map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => typeNum(ch)}
                    className="h-9 w-9 rounded-lg border border-[#e2bfb0] bg-white text-xs font-bold active:bg-[#ffdbcc]"
                  >
                    {ch}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={resetKiosk}
                className="mt-5 flex w-full items-center justify-center gap-2 py-3 font-bold text-[#5a4136]"
              >
                <X className="h-5 w-5" /> Cancel
              </button>
            </div>
          )}

          {modal.kind === 'search' && (
            <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[32px] bg-white/95 p-6 shadow-2xl md:p-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-extrabold">Search Bookings</h2>
                <button
                  type="button"
                  onClick={resetKiosk}
                  className="rounded-full bg-[#fff1eb] p-2"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8e7164]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, court, code, or booking ID…"
                  className="w-full rounded-2xl border border-[#e2bfb0] bg-[#fff1eb] py-3 pl-11 pr-4 text-base font-medium outline-none focus:border-[#ff6b00]"
                  autoFocus
                />
              </div>
              {manualCode && (
                <p className="mb-3 rounded-xl bg-[#dae2fd] px-3 py-2 text-sm font-semibold text-[#3f465c]">
                  Code entered: <span className="font-mono">{manualCode}</span> — select a booking
                  to check in.
                </p>
              )}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="py-8 text-center text-[#5a4136]">No matching bookings today.</p>
                ) : (
                  searchResults.map((b) => {
                    const { hh, mm } = timeParts(b.slot.startTime);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          if (manualCode.trim()) {
                            scanLock.current = true;
                            checkInMutation.mutate({
                              bookingId: b.id,
                              checkInCode: manualCode.trim(),
                            });
                            return;
                          }
                          setManualCode('');
                          setModal({
                            kind: 'manual',
                            bookingId: b.id,
                            guestName: guestName(b),
                          });
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl border border-[#e2bfb0] bg-white p-3 text-left hover:border-[#a04100]"
                      >
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-[#fff1eb]">
                          <span className="text-lg font-extrabold leading-none">{hh}</span>
                          <span className="text-[9px] font-bold">{mm}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{guestName(b)}</p>
                          <p className="truncate text-sm text-[#5a4136]">
                            {b.court?.name} · {formatSlotRange(b.slot.startTime, b.slot.endTime)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[#8e7164]" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes kiosk-scan {
          0% { top: 8%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 88%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
