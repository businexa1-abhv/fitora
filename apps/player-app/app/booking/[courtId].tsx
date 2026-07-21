import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SPORT_LABELS,
  SportType,
  formatCurrency,
  type Court,
  type CourtSlot,
} from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { SPORT_COLORS, SPORT_EMOJI } from '@/lib/constants';
import { ApiError } from '@/lib/api';
import { getCourt, getCourtSlots, createBooking, joinWaitlist } from '@/lib/courts';
import { getVenue } from '@/lib/venues';
import { completePayment } from '@/lib/payments';
import { useCourtSlotsLive } from '@/hooks/use-court-slots-live';
import { FontSize, Radius, Spacing } from '@/constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Booking hold TTL: 5 minutes in seconds (displayed countdown) */
const HOLD_TTL_SECONDS = 5 * 60;

/** Duration options shown in the picker */
const DURATION_OPTIONS_MINUTES = [30, 60, 90, 120, 180];

// ─── Status palette ───────────────────────────────────────────────────────────

type SlotStatusKey = 'AVAILABLE' | 'RESERVED' | 'FULL' | 'CLOSED' | 'TOURNAMENT' | 'MAINTENANCE';

const SLOT_STATUS_META: Record<SlotStatusKey, { color: string; label: string }> = {
  AVAILABLE: { color: '#22C55E', label: 'Open' },
  RESERVED: { color: '#E8A317', label: 'Reserved' },
  FULL: { color: '#EF4444', label: 'Full' },
  CLOSED: { color: '#9CA3AF', label: 'Closed' },
  TOURNAMENT: { color: '#3B82F6', label: 'Tournament' },
  MAINTENANCE: { color: '#FFDB17', label: 'Maintenance' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortCourtLabel(name: string, index: number) {
  const match = name.match(/Court\s+(\d+)/i);
  if (match) return `Court ${match[1]}`;
  return `Court ${index + 1}`;
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHHMM(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function toLocalIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function todayIso() {
  return toLocalIso(new Date());
}

function buildDateOptions() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      iso: toLocalIso(date),
      day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: date.toLocaleDateString('en-IN', { day: '2-digit' }),
      month: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  });
}

function slotMinutes(slot: CourtSlot) {
  return Math.max(
    15,
    Math.round((new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / 60000),
  );
}

function slotDurationLabel(slot?: CourtSlot) {
  if (!slot) return '60 min';
  const mins = slotMinutes(slot);
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins} min`;
}

function occupiedSeats(slot: CourtSlot) {
  const reserved = slot.reservedSeats ?? 0;
  const confirmed = slot.confirmedSeats ?? 0;
  if (reserved + confirmed > 0) return reserved + confirmed;
  const capacity = slot.capacity ?? 1;
  const available = slot.availableSeats ?? capacity;
  return Math.max(0, capacity - available);
}

function isSlotBlocked(slot: CourtSlot) {
  if (slot.isBlocked) return true;
  const status = slot.availabilityStatus;
  const op = slot.operationalState;
  if (status === 'BLOCKED' || op === 'BLOCKED') return true;
  if (status === 'MAINTENANCE' || op === 'MAINTENANCE') return true;
  if (status === 'TOURNAMENT' || op === 'TOURNAMENT') return true;
  if (status === 'CLOSED' || op === 'CLOSED') return true;
  if (status === 'PRIVATE' || op === 'PRIVATE') return true;
  if (status === 'HOLIDAY') return true;
  return false;
}

function isSlotFull(slot: CourtSlot) {
  if (isSlotBlocked(slot)) return false;
  if (slot.availabilityStatus === 'FULL') return true;
  if (typeof slot.availableSeats === 'number' && slot.availableSeats <= 0) return true;
  return !!slot.isBooked;
}

function isSlotBookable(slot: CourtSlot) {
  if (typeof slot.isBookable === 'boolean') return slot.isBookable;
  return !isSlotBlocked(slot) && !isSlotFull(slot);
}

function slotStatus(slot: CourtSlot): SlotStatusKey {
  const status = slot.availabilityStatus;
  const op = slot.operationalState;
  if (status === 'MAINTENANCE' || op === 'MAINTENANCE') return 'MAINTENANCE';
  if (status === 'TOURNAMENT' || op === 'TOURNAMENT') return 'TOURNAMENT';
  if (isSlotBlocked(slot)) return 'CLOSED';
  if (isSlotFull(slot)) return 'FULL';
  if (status === 'FEW_SPOTS' || (slot.reservedSeats ?? 0) > 0) return 'RESERVED';
  return 'AVAILABLE';
}

/** Find the best contiguous available block for the requested duration */
function findSmartSuggestions(slots: CourtSlot[], durationMinutes: number, limit = 3): CourtSlot[] {
  const sorted = [...slots].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const results: CourtSlot[] = [];

  for (const slot of sorted) {
    if (!isSlotBookable(slot)) continue;
    const slotLen = slotMinutes(slot);
    // For fixed-duration mode: exact match
    if (slotLen === durationMinutes) {
      results.push(slot);
    }
    // For variable: accept slots that cover the duration
    else if (slotLen >= durationMinutes) {
      results.push(slot);
    }
    if (results.length >= limit) break;
  }
  return results;
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Duration selector with pill buttons */
function DurationPicker({
  options,
  active,
  onSelect,
}: {
  options: number[];
  active: number;
  onSelect: (d: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={dpStyles.row}
    >
      {options.map((d) => {
        const isActive = d === active;
        const label =
          d >= 60 && d % 60 === 0
            ? `${d / 60}h`
            : d >= 60
              ? `${Math.floor(d / 60)}h ${d % 60}m`
              : `${d}m`;
        return (
          <Pressable
            key={d}
            onPress={() => onSelect(d)}
            style={[
              dpStyles.pill,
              {
                backgroundColor: isActive ? colors.primaryLight : colors.card,
                borderColor: isActive ? colors.accent : colors.border,
              },
            ]}
          >
            <Text style={[dpStyles.pillText, { color: isActive ? colors.accent : colors.muted }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const dpStyles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  pill: {
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  pillText: { fontSize: FontSize.sm, fontWeight: '800' },
});

/** "Best match" smart suggestion card */
function SmartSuggestionCard({
  slot,
  rank,
  onSelect,
  accentColor,
}: {
  slot: CourtSlot;
  rank: number;
  onSelect: (id: string) => void;
  accentColor: string;
}) {
  const { colors } = useTheme();
  const startLabel = formatSlotTime(slot.startTime);
  const endLabel = formatSlotTime(slot.endTime);
  const price = formatCurrency(Number(slot.price) || 0);
  const stars = rank === 0 ? '★★★★★' : rank === 1 ? '★★★★' : '★★★';
  const label = rank === 0 ? 'Best Match' : rank === 1 ? 'Good Option' : 'Alternative';

  return (
    <Pressable
      onPress={() => onSelect(slot.id)}
      style={({ pressed }) => [
        ssStyles.card,
        {
          backgroundColor: rank === 0 ? `${accentColor}15` : colors.card,
          borderColor: rank === 0 ? accentColor : colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={ssStyles.top}>
        <Text style={[ssStyles.stars, { color: accentColor }]}>{stars}</Text>
        <View
          style={[
            ssStyles.labelPill,
            { backgroundColor: rank === 0 ? accentColor : colors.mutedBg },
          ]}
        >
          <Text style={[ssStyles.labelText, { color: rank === 0 ? '#fff' : colors.muted }]}>
            {label}
          </Text>
        </View>
      </View>
      <Text style={[ssStyles.time, { color: colors.foreground }]}>
        {startLabel} – {endLabel}
      </Text>
      <Text style={[ssStyles.price, { color: colors.muted }]}>{price}</Text>
    </Pressable>
  );
}

const ssStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    minWidth: 140,
    padding: Spacing.md,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  stars: { fontSize: 10, fontWeight: '700' },
  labelPill: { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  labelText: { fontSize: 9, fontWeight: '800' },
  time: { fontSize: FontSize.sm, fontWeight: '900' },
  price: { fontSize: FontSize.xs, fontWeight: '600' },
});

/** Hold countdown timer banner */
function HoldBanner({ seconds, onRelease }: { seconds: number; onRelease: () => void }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  const isUrgent = seconds <= 60;

  useEffect(() => {
    if (!isUrgent) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isUrgent, pulse]);

  return (
    <Animated.View
      style={[
        holdStyles.banner,
        {
          backgroundColor: isUrgent ? '#EF444415' : `${colors.accent}15`,
          borderColor: isUrgent ? '#EF4444' : colors.accent,
          transform: [{ scale: pulse }],
        },
      ]}
    >
      <Ionicons name="time-outline" size={16} color={isUrgent ? '#EF4444' : colors.accent} />
      <Text style={[holdStyles.text, { color: isUrgent ? '#EF4444' : colors.accent }]}>
        Slot held for <Text style={holdStyles.timer}>{formatCountdown(seconds)}</Text> — complete
        payment to confirm
      </Text>
      <Pressable onPress={onRelease} style={holdStyles.releaseBtn}>
        <Text style={[holdStyles.releaseText, { color: colors.muted }]}>Release</Text>
      </Pressable>
    </Animated.View>
  );
}

const holdStyles = StyleSheet.create({
  banner: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  text: { flex: 1, fontSize: FontSize.xs, fontWeight: '700' },
  timer: { fontWeight: '900' },
  releaseBtn: { padding: 4 },
  releaseText: { fontSize: FontSize.xs, fontWeight: '700' },
});

/** Width in px for one hour of slot duration in the horizontal timeline */
const PX_PER_HOUR = 88;

/** Interactive horizontal timeline with labeled time markers */
function TimelineView({
  slots,
  selectedId,
  onSlotPress,
}: {
  slots: CourtSlot[];
  selectedId: string | null;
  activeDuration: number;
  onSlotPress: (slot: CourtSlot) => void;
}) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const sorted = useMemo(
    () =>
      [...slots].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [slots],
  );

  if (sorted.length === 0) return null;

  // Group slots by time period
  const PERIODS = [
    { label: 'Morning', start: 5, end: 12 },
    { label: 'Afternoon', start: 12, end: 17 },
    { label: 'Evening', start: 17, end: 24 },
  ];

  const slotsByPeriod = PERIODS.map((p) => ({
    ...p,
    slots: sorted.filter((s) => {
      const h = new Date(s.startTime).getHours();
      return h >= p.start && h < p.end;
    }),
  })).filter((p) => p.slots.length > 0);

  return (
    <View>
      {slotsByPeriod.map((period) => (
        <View key={period.label} style={tlvStyles.periodSection}>
          <Text style={[tlvStyles.periodLabel, { color: colors.muted }]}>{period.label}</Text>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tlvStyles.scrollContent}
          >
            {period.slots.map((slot) => {
              const isSelected = slot.id === selectedId;
              const statusKey = slotStatus(slot);
              const meta = SLOT_STATUS_META[statusKey];
              const bookable = isSlotBookable(slot);
              const full = statusKey === 'FULL';
              const unavailable = !bookable && !full;
              const capacity = slot.capacity ?? 1;
              const taken = occupiedSeats(slot);
              const seatsLeft = slot.availableSeats ?? Math.max(0, capacity - taken);
              const fillRatio = capacity > 0 ? Math.min(1, taken / capacity) : 0;
              const showSeats =
                capacity > 1 && (statusKey === 'AVAILABLE' || statusKey === 'RESERVED');

              // Calculate proportional width based on slot duration
              const durationHrs = slotMinutes(slot) / 60;
              const segWidth = Math.max(72, durationHrs * PX_PER_HOUR);

              return (
                <Pressable
                  key={slot.id}
                  disabled={unavailable}
                  onPress={() => onSlotPress(slot)}
                  style={[
                    tlvStyles.slotCell,
                    {
                      width: segWidth,
                      backgroundColor: isSelected
                        ? colors.accent
                        : statusKey === 'AVAILABLE'
                          ? colors.card
                          : `${meta.color}1A`,
                      borderColor: isSelected ? colors.accent : meta.color,
                      opacity: unavailable ? 0.45 : 1,
                    },
                  ]}
                >
                  {/* Time */}
                  <Text
                    style={[tlvStyles.cellTime, { color: isSelected ? '#fff' : colors.foreground }]}
                    numberOfLines={1}
                  >
                    {formatHHMM(slot.startTime)}
                  </Text>

                  {/* Price */}
                  <Text
                    style={[
                      tlvStyles.cellPrice,
                      { color: isSelected ? 'rgba(255,255,255,0.9)' : colors.muted },
                    ]}
                    numberOfLines={1}
                  >
                    {formatCurrency(Number(slot.price) || 0)}
                  </Text>

                  {/* Occupancy bar */}
                  {showSeats && (
                    <>
                      <Text
                        style={[
                          tlvStyles.cellSeats,
                          { color: isSelected ? 'rgba(255,255,255,0.85)' : meta.color },
                        ]}
                        numberOfLines={1}
                      >
                        {seatsLeft} left
                      </Text>
                      <View
                        style={[
                          tlvStyles.barTrack,
                          {
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.28)' : colors.mutedBg,
                          },
                        ]}
                      >
                        <View
                          style={[
                            tlvStyles.barFill,
                            {
                              width: `${Math.round(fillRatio * 100)}%`,
                              backgroundColor: isSelected ? '#fff' : meta.color,
                            },
                          ]}
                        />
                      </View>
                    </>
                  )}

                  {/* Status label */}
                  {statusKey !== 'AVAILABLE' && (
                    <Text
                      style={[tlvStyles.cellStatus, { color: isSelected ? '#fff' : meta.color }]}
                      numberOfLines={1}
                    >
                      {meta.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const tlvStyles = StyleSheet.create({
  periodSection: { marginBottom: Spacing.md },
  periodLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    textTransform: 'uppercase',
  },
  scrollContent: {
    gap: 6,
    paddingHorizontal: Spacing.lg,
  },
  slotCell: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: 2,
    minWidth: 72,
    padding: 8,
  },
  cellTime: { fontSize: FontSize.xs, fontWeight: '900' },
  cellPrice: { fontSize: 10, fontWeight: '600' },
  cellSeats: { fontSize: 9, fontWeight: '700' },
  barTrack: { borderRadius: 2, height: 3, overflow: 'hidden' },
  barFill: { borderRadius: 2, height: 3 },
  cellStatus: { fontSize: 9, fontWeight: '700' },
});

/** Order summary rows */
function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={srStyles.row}>
      <Text style={[srStyles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[srStyles.value, { color: accent ? colors.accent : colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

const srStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: FontSize.sm, fontWeight: '600' },
  value: { fontSize: FontSize.sm, fontWeight: '800' },
});

/** Legend dot */
function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={ldStyles.wrap}>
      <View style={[ldStyles.dot, { backgroundColor: color }]} />
      <Text style={[ldStyles.text, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const ldStyles = StyleSheet.create({
  wrap: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  dot: { borderRadius: Radius.full, height: 7, width: 7 },
  text: { fontSize: FontSize.xs, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookingScreen() {
  const { courtId } = useLocalSearchParams<{ courtId: string }>();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [activeDuration, setActiveDuration] = useState<number>(60);
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const dateOptions = useMemo(() => buildDateOptions(), []);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const courtQuery = useQuery({
    queryKey: ['court', courtId],
    queryFn: () => getCourt(courtId!, token ?? undefined),
    enabled: !!courtId,
  });

  const venueQuery = useQuery({
    queryKey: ['venue', courtQuery.data?.tenantId],
    queryFn: () => getVenue(courtQuery.data!.tenantId!),
    enabled: !!courtQuery.data?.tenantId,
  });

  const slotsQuery = useQuery({
    queryKey: ['slots', courtId, selectedDate],
    queryFn: () => getCourtSlots(courtId!, selectedDate),
    enabled: !!courtId,
  });

  useCourtSlotsLive(courtId, selectedDate, token);

  // Deselect slot if it became blocked after live update
  useEffect(() => {
    if (!selectedSlot) return;
    const slot = slotsQuery.data?.find((s) => s.id === selectedSlot);
    if (slot && isSlotBlocked(slot)) {
      setSelectedSlot(null);
    }
  }, [slotsQuery.data, selectedSlot]);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const court = courtQuery.data;
  const siblingCourts = venueQuery.data?.courts?.length
    ? venueQuery.data.courts
    : court
      ? [court]
      : [];
  const slots = slotsQuery.data ?? [];

  // Available duration options derived from actual slot durations on this date
  const durationOptions = useMemo(() => {
    const fromSlots = [...new Set(slots.map((s) => slotMinutes(s)))].sort((a, b) => a - b);
    return fromSlots.length > 0 ? fromSlots : DURATION_OPTIONS_MINUTES;
  }, [slots]);

  // Ensure activeDuration is always valid
  const effectiveDuration = durationOptions.includes(activeDuration)
    ? activeDuration
    : (durationOptions[0] ?? 60);

  // Filter slots matching the selected duration
  const visibleSlots =
    durationOptions.length > 1 ? slots.filter((s) => slotMinutes(s) === effectiveDuration) : slots;

  // Smart suggestions: first 3 bookable slots
  const suggestions = useMemo(
    () => findSmartSuggestions(visibleSlots, effectiveDuration, 3),
    [visibleSlots, effectiveDuration],
  );

  const selected = slots.find((s) => s.id === selectedSlot);
  const selectedIsFull = selected ? isSlotFull(selected) : false;
  const selectedBookable = selected ? isSlotBookable(selected) : false;
  const total = selected && selectedBookable ? Number(selected.price) : 0;
  const sport: SportType = (court?.sportType as SportType | null) ?? SportType.OTHER;
  const sportColor = SPORT_COLORS[sport];
  const selectedMonth = dateOptions.find((d) => d.iso === selectedDate)?.month ?? '';
  const venueTitle = venueQuery.data?.name ?? court?.name ?? 'Book a Court';
  const courtIndex = siblingCourts.findIndex((c) => c.id === courtId);
  const courtLabel = court
    ? shortCourtLabel(court.name, courtIndex >= 0 ? courtIndex : 0)
    : 'Court';

  // ── Hold countdown ────────────────────────────────────────────────────────────

  const startHoldTimer = useCallback(() => {
    clearInterval(holdTimerRef.current);
    setHoldSeconds(HOLD_TTL_SECONDS);
    holdTimerRef.current = setInterval(() => {
      setHoldSeconds((prev) => {
        if (prev == null || prev <= 1) {
          clearInterval(holdTimerRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const releaseHold = useCallback(() => {
    clearInterval(holdTimerRef.current);
    setHoldSeconds(null);
    setSelectedSlot(null);
  }, []);

  useEffect(() => {
    return () => clearInterval(holdTimerRef.current);
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!token || !courtId || !selected) throw new Error('Missing booking data');
      const checkout = await createBooking(token, courtId, selected.id, {
        expectedVersion: selected.version,
        seats: 1,
      });
      startHoldTimer();
      const paymentResult = (await completePayment(
        token,
        checkout.payment,
        user?.email ?? '',
        user ? `${user.firstName} ${user.lastName}` : 'Player',
      )) as { entity?: { checkInCode?: string | null } } | undefined;
      const checkInCode =
        paymentResult?.entity?.checkInCode ?? checkout.booking.checkInCode ?? undefined;
      clearInterval(holdTimerRef.current);
      setHoldSeconds(null);
      return { checkout, slot: selected, checkInCode };
    },
    onSuccess: ({ checkout, slot, checkInCode }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots', courtId, selectedDate] });
      router.replace({
        pathname: '/booking/success',
        params: {
          bookingId: checkout.booking.id,
          courtName: checkout.booking.court?.name ?? court?.name ?? 'Court Booking',
          city: checkout.booking.court?.city ?? court?.city ?? '',
          startTime: slot.startTime,
          endTime: slot.endTime,
          amount: checkout.booking.totalAmount ?? String(total),
          ...(checkInCode ? { checkInCode } : {}),
        },
      });
    },
    onError: (err: Error) => {
      clearInterval(holdTimerRef.current);
      setHoldSeconds(null);
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['slots', courtId, selectedDate] });
        setSelectedSlot(null);
        const nearby = (err.nearbySlots ?? [])
          .map((slot) => (slot.startTime ? formatSlotTime(slot.startTime) : null))
          .filter(Boolean)
          .slice(0, 3);
        const suggestion = nearby.length > 0 ? `\n\nAvailable nearby: ${nearby.join(', ')}` : '';
        Alert.alert('Slot taken', `${err.message}${suggestion}`);
        return;
      }
      Alert.alert('Booking failed', err.message);
    },
  });

  const waitlistMutation = useMutation({
    mutationFn: async () => {
      if (!token || !courtId || !selected) throw new Error('Missing waitlist data');
      return joinWaitlist(token, courtId, selected.id);
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      Alert.alert(
        'Joined Waitlist 🎯',
        `You are #${entry.position} in line. We will notify you instantly if a spot opens.`,
      );
    },
    onError: (err: Error) => Alert.alert('Waitlist failed', err.message),
  });

  // ── Event handlers ────────────────────────────────────────────────────────────

  const handleDatePress = useCallback((iso: string) => {
    setSelectedDate(iso);
    setSelectedSlot(null);
    clearInterval(holdTimerRef.current);
    setHoldSeconds(null);
  }, []);

  const handleDurationPress = useCallback(
    (duration: number) => {
      setActiveDuration(duration);
      if (selected && slotMinutes(selected) !== duration) {
        setSelectedSlot(null);
        clearInterval(holdTimerRef.current);
        setHoldSeconds(null);
      }
    },
    [selected],
  );

  const handleSlotPress = useCallback((slot: CourtSlot) => {
    setSelectedSlot(slot.id);
  }, []);

  const handleSuggestionSelect = useCallback((id: string) => {
    setSelectedSlot(id);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  const isLoading = courtQuery.isLoading || slotsQuery.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={venueTitle}
        showBack
        rightAction={<Ionicons name="help-circle-outline" size={24} color={colors.primary} />}
      />

      {/* Hold countdown banner */}
      {holdSeconds != null && <HoldBanner seconds={holdSeconds} onRelease={releaseHold} />}

      <QueryState
        isLoading={isLoading}
        isError={courtQuery.isError || slotsQuery.isError}
        error={(courtQuery.error ?? slotsQuery.error) as Error}
        onRetry={() => {
          courtQuery.refetch();
          slotsQuery.refetch();
        }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Sport label + court switcher ── */}
          <View style={styles.courtSwitcherHeader}>
            <View>
              <Text style={[styles.sportLabel, { color: sportColor }]}>
                {SPORT_EMOJI[sport]} {SPORT_LABELS[sport]}
              </Text>
              <Text style={[styles.courtLabelText, { color: colors.foreground }]}>
                {courtLabel}
              </Text>
            </View>
          </View>

          {/* Court tiles (sibling court switcher) */}
          {siblingCourts.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.courtTileRow}
            >
              {siblingCourts.map((item, index) => {
                const active = item.id === courtId;
                const itemSport = (item.sportType as SportType | null) ?? SportType.OTHER;
                return (
                  <CourtTile
                    key={item.id}
                    active={active}
                    emoji={SPORT_EMOJI[itemSport]}
                    label={shortCourtLabel(item.name, index)}
                    sportColor={SPORT_COLORS[itemSport]}
                    onPress={() => {
                      if (item.id === courtId) return;
                      setSelectedSlot(null);
                      clearInterval(holdTimerRef.current);
                      setHoldSeconds(null);
                      router.setParams({ courtId: item.id });
                    }}
                  />
                );
              })}
            </ScrollView>
          )}

          {/* ── Date picker (14 days) ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Date</Text>
            <Text style={[styles.monthText, { color: colors.muted }]}>{selectedMonth}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {dateOptions.map((option) => {
              const active = selectedDate === option.iso;
              return (
                <Pressable
                  key={option.iso}
                  onPress={() => handleDatePress(option.iso)}
                  style={[
                    styles.dateCard,
                    {
                      backgroundColor: active ? colors.accent : colors.card,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.dateDay, { color: active ? '#fff' : colors.muted }]}>
                    {option.day}
                  </Text>
                  <Text style={[styles.dateNumber, { color: active ? '#fff' : colors.foreground }]}>
                    {option.date}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Duration picker ── */}
          <View style={[styles.sectionHeader, styles.sectionPaddedH]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Duration</Text>
          </View>
          <DurationPicker
            options={durationOptions}
            active={effectiveDuration}
            onSelect={handleDurationPress}
          />

          {/* ── Smart suggestions ── */}
          {suggestions.length > 0 && (
            <>
              <View style={[styles.sectionHeader, styles.sectionPaddedH]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Suggested Slots
                </Text>
                <Text style={[styles.sectionSub, { color: colors.muted }]}>
                  Best available for{' '}
                  {effectiveDuration >= 60 ? `${effectiveDuration / 60}h` : `${effectiveDuration}m`}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsRow}
              >
                {suggestions.map((slot, idx) => (
                  <SmartSuggestionCard
                    key={slot.id}
                    slot={slot}
                    rank={idx}
                    onSelect={handleSuggestionSelect}
                    accentColor={sportColor}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* ── Timeline (horizontal, grouped by morning / afternoon / evening) ── */}
          <View style={[styles.sectionHeader, styles.sectionPaddedH]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Timeline</Text>
            {/* Legend */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.legendRow}>
                {(Object.keys(SLOT_STATUS_META) as SlotStatusKey[]).map((key) => (
                  <LegendDot
                    key={key}
                    color={SLOT_STATUS_META[key].color}
                    label={SLOT_STATUS_META[key].label}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          {visibleSlots.length > 0 ? (
            <TimelineView
              slots={visibleSlots}
              selectedId={selectedSlot}
              activeDuration={effectiveDuration}
              onSlotPress={handleSlotPress}
            />
          ) : (
            <View
              style={[
                styles.emptySlots,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={styles.emptySlotsEmoji}>📅</Text>
              <Text style={[styles.emptySlotsText, { color: colors.muted }]}>
                No slots available for this date
              </Text>
            </View>
          )}

          {/* ── Order summary ── */}
          <View
            style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Order Summary</Text>
            <SummaryRow
              label={`${courtLabel} (${selected ? slotDurationLabel(selected) : `${effectiveDuration} min`})`}
              value={selected ? formatCurrency(total) : '—'}
            />
            {selected && (selected.capacity ?? 1) > 1 && (
              <SummaryRow
                label="Seats available"
                value={String(
                  selected.availableSeats ??
                    Math.max(0, (selected.capacity ?? 1) - occupiedSeats(selected)),
                )}
              />
            )}
            {selected && (
              <>
                <SummaryRow
                  label="Time"
                  value={`${formatSlotTime(selected.startTime)} – ${formatSlotTime(selected.endTime)}`}
                />
                <SummaryRow
                  label="Date"
                  value={new Date(selectedDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                />
              </>
            )}
            <SummaryRow label="Equipment Rental" value="Included" />
            <SummaryRow label="Platform Fee" value="Free" />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.accent }]}>
                {selected ? formatCurrency(total) : formatCurrency(0)}
              </Text>
            </View>
          </View>

          {/* Waitlist info for full slots */}
          {selectedIsFull && (
            <View
              style={[
                styles.waitlistBanner,
                { backgroundColor: `${colors.accent}12`, borderColor: colors.accent },
              ]}
            >
              <Ionicons name="hourglass-outline" size={18} color={colors.accent} />
              <Text style={[styles.waitlistText, { color: colors.accent }]}>
                This slot is full. Join the waitlist and we&apos;ll notify you instantly if a spot
                opens.
              </Text>
            </View>
          )}
        </ScrollView>
      </QueryState>

      {/* ── Footer CTA ── */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
        <View>
          <Text style={[styles.footerLabel, { color: colors.muted }]}>Total</Text>
          <Text style={[styles.footerAmount, { color: colors.foreground }]}>
            {selected ? formatCurrency(total) : formatCurrency(0)}
          </Text>
        </View>
        <Button
          label={
            waitlistMutation.isPending
              ? 'Joining...'
              : bookMutation.isPending
                ? 'Processing...'
                : selectedIsFull
                  ? '🔔 Join Waitlist'
                  : selected
                    ? selectedBookable
                      ? '⚡ Book Now'
                      : 'Unavailable'
                    : 'Select a slot'
          }
          disabled={
            !selected ||
            (!selectedBookable && !selectedIsFull) ||
            bookMutation.isPending ||
            waitlistMutation.isPending
          }
          onPress={() => {
            if (selectedIsFull) {
              waitlistMutation.mutate();
              return;
            }
            if (!selectedBookable) return;
            bookMutation.mutate();
          }}
          style={styles.payButton}
        />
      </View>
    </View>
  );
}

// ─── CourtTile ────────────────────────────────────────────────────────────────

function CourtTile({
  active,
  emoji,
  label,
  sportColor,
  onPress,
}: {
  active: boolean;
  emoji: string;
  label: string;
  sportColor: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        ctStyles.tile,
        {
          backgroundColor: active ? `${sportColor}22` : colors.card,
          borderColor: active ? sportColor : colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={ctStyles.emoji}>{emoji}</Text>
      <Text style={[ctStyles.label, { color: active ? sportColor : colors.muted }]}>{label}</Text>
      {active && <View style={[ctStyles.activeDot, { backgroundColor: sportColor }]} />}
    </Pressable>
  );
}

const ctStyles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: 4,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  emoji: { fontSize: 22 },
  label: { fontSize: FontSize.xs, fontWeight: '800' },
  activeDot: { borderRadius: Radius.full, height: 5, width: 5 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Court switcher header
  courtSwitcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sportLabel: { fontSize: FontSize.xs, fontWeight: '800', marginBottom: 2 },
  courtLabelText: { fontSize: FontSize.xl, fontWeight: '900' },
  courtTileRow: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },

  // Section headers
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.xl,
  },
  sectionPaddedH: { paddingHorizontal: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '900' },
  sectionSub: { fontSize: FontSize.xs, fontWeight: '600' },
  monthText: { fontSize: FontSize.xs, fontWeight: '600' },

  // Date picker
  dateRow: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  dateCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minWidth: 52,
  },
  dateDay: { fontSize: FontSize.xs, fontWeight: '700' },
  dateNumber: { fontSize: FontSize.lg, fontWeight: '900' },

  // Suggestions
  suggestionsRow: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },

  // Legend
  legendRow: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm },

  // Empty
  emptySlots: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    padding: Spacing.xl,
  },
  emptySlotsEmoji: { fontSize: 32 },
  emptySlotsText: { fontSize: FontSize.sm, fontWeight: '600' },

  // Summary card
  summary: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    margin: Spacing.lg,
    padding: Spacing.lg,
  },
  summaryTitle: { fontSize: FontSize.md, fontWeight: '900', marginBottom: Spacing.xs },
  divider: { height: 1, marginVertical: Spacing.xs },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: FontSize.md, fontWeight: '900' },
  totalValue: { fontSize: FontSize.xl, fontWeight: '900' },

  // Waitlist banner
  waitlistBanner: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  waitlistText: { flex: 1, fontSize: FontSize.xs, fontWeight: '700' },

  // Footer
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  footerLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  footerAmount: { fontSize: FontSize.lg, fontWeight: '900' },
  payButton: { flex: 1, marginLeft: Spacing.lg },
});
