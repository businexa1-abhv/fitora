import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

/** Six-state slot status palette: green / red / orange / gray / blue / yellow. */
type SlotStatusKey = 'AVAILABLE' | 'RESERVED' | 'FULL' | 'CLOSED' | 'TOURNAMENT' | 'MAINTENANCE';

const SLOT_STATUS_META: Record<SlotStatusKey, { color: string; label: string }> = {
  AVAILABLE: { color: '#22C55E', label: 'Open' },
  RESERVED: { color: '#E8A317', label: 'Reserved' },
  FULL: { color: '#EF4444', label: 'Full' },
  CLOSED: { color: '#9CA3AF', label: 'Closed' },
  TOURNAMENT: { color: '#3B82F6', label: 'Tournament' },
  MAINTENANCE: { color: '#FFDB17', label: 'Maintenance' },
};

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

function toLocalIso(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function todayIso() {
  return toLocalIso(new Date());
}

function buildDateOptions() {
  return Array.from({ length: 7 }, (_, index) => {
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

function getPrimaryImage(court: Court) {
  const primary =
    court.images.find((image) => typeof image !== 'string' && image.isPrimary) ?? court.images[0];
  return typeof primary === 'string' ? primary : primary?.url;
}

function slotMinutes(slot: CourtSlot) {
  return Math.max(
    30,
    Math.round((new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / 60000),
  );
}

function slotDurationLabel(slot?: CourtSlot) {
  if (!slot) return '60 Mins';
  return `${slotMinutes(slot)} Mins`;
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

export default function BookingScreen() {
  const { courtId } = useLocalSearchParams<{ courtId: string }>();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const dateOptions = buildDateOptions();

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

  useEffect(() => {
    if (!selectedSlot) return;
    const slot = slotsQuery.data?.find((item) => item.id === selectedSlot);
    if (slot && isSlotBlocked(slot)) {
      setSelectedSlot(null);
    }
  }, [slotsQuery.data, selectedSlot]);

  const court = courtQuery.data;
  const siblingCourts = venueQuery.data?.courts?.length
    ? venueQuery.data.courts
    : court
      ? [court]
      : [];
  const slots = slotsQuery.data ?? [];

  // Duration pills reflect the real slot durations available on this date.
  const durationOptions = useMemo(() => {
    const unique = [...new Set(slots.map((slot) => slotMinutes(slot)))].sort((a, b) => a - b);
    return unique.length > 0 ? unique : [60];
  }, [slots]);
  const activeDuration =
    selectedDuration != null && durationOptions.includes(selectedDuration)
      ? selectedDuration
      : durationOptions[0]!;
  const visibleSlots =
    durationOptions.length > 1
      ? slots.filter((slot) => slotMinutes(slot) === activeDuration)
      : slots;

  const selected = slots.find((slot) => slot.id === selectedSlot);
  const selectedIsFull = selected ? isSlotFull(selected) : false;
  const selectedIsBookable = selected ? isSlotBookable(selected) : false;
  const total = selected && selectedIsBookable ? Number(selected.price) : 0;
  const sport: SportType = (court?.sportType as SportType | null) ?? SportType.OTHER;
  const imageUrl = court ? getPrimaryImage(court) : undefined;
  const selectedMonth = dateOptions.find((date) => date.iso === selectedDate)?.month ?? '';
  const venueTitle = venueQuery.data?.name ?? court?.name ?? 'Select Court';
  const courtIndexInVenue = siblingCourts.findIndex((item) => item.id === courtId);
  const courtSummaryLabel = court
    ? shortCourtLabel(court.name, courtIndexInVenue >= 0 ? courtIndexInVenue : 0)
    : 'Court';

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!token || !courtId || !selected) throw new Error('Missing booking data');
      const checkout = await createBooking(token, courtId, selected.id, {
        expectedVersion: selected.version,
        seats: 1,
      });
      const paymentResult = (await completePayment(
        token,
        checkout.payment,
        user?.email ?? '',
        user ? `${user.firstName} ${user.lastName}` : 'Player',
      )) as { entity?: { checkInCode?: string | null } } | undefined;
      const checkInCode =
        paymentResult?.entity?.checkInCode ?? checkout.booking.checkInCode ?? undefined;
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
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['slots', courtId, selectedDate] });
        setSelectedSlot(null);
        const nearby = (err.nearbySlots ?? [])
          .map((slot) => (slot.startTime ? formatSlotTime(slot.startTime) : null))
          .filter(Boolean)
          .slice(0, 3);
        const suggestion = nearby.length > 0 ? `\n\nNearby open slots: ${nearby.join(', ')}` : '';
        Alert.alert('Slot no longer available', `${err.message}${suggestion}`);
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
        'Joined waitlist',
        `You are #${entry.position} in line. We will notify you if a spot opens.`,
      );
    },
    onError: (err: Error) => Alert.alert('Waitlist failed', err.message),
  });

  function handleDatePress(iso: string) {
    setSelectedDate(iso);
    setSelectedSlot(null);
    setSelectedDuration(null);
  }

  function handleDurationPress(duration: number) {
    setSelectedDuration(duration);
    if (selected && slotMinutes(selected) !== duration) {
      setSelectedSlot(null);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Book a Court"
        showBack
        rightAction={<Ionicons name="help-circle-outline" size={24} color={colors.primary} />}
      />

      <QueryState
        isLoading={courtQuery.isLoading || slotsQuery.isLoading}
        isError={courtQuery.isError || slotsQuery.isError}
        error={(courtQuery.error ?? slotsQuery.error) as Error}
        onRetry={() => {
          courtQuery.refetch();
          slotsQuery.refetch();
        }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 132 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{venueTitle}</Text>
              <Text style={[styles.sportText, { color: colors.accent }]}>
                {SPORT_LABELS[sport]}
              </Text>
            </View>

            {siblingCourts.length > 0 && (
              <View style={styles.courtGrid}>
                {siblingCourts.map((item, index) => {
                  const active = item.id === courtId;
                  const itemSport = (item.sportType as SportType | null) ?? SportType.OTHER;
                  return (
                    <CourtTile
                      key={item.id}
                      active={active}
                      emoji={SPORT_EMOJI[itemSport]}
                      imageUrl={active ? imageUrl : undefined}
                      label={shortCourtLabel(item.name, index)}
                      sportColor={SPORT_COLORS[itemSport]}
                      subtitle={active ? 'Selected' : 'Available'}
                      onPress={() => {
                        if (item.id === courtId) return;
                        setSelectedSlot(null);
                        router.setParams({ courtId: item.id });
                      }}
                    />
                  );
                })}
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Date</Text>
              <Text style={[styles.monthText, { color: colors.muted }]}>{selectedMonth}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              <View style={styles.dateRow}>
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
                      <Text
                        style={[styles.dateNumber, { color: active ? '#fff' : colors.foreground }]}
                      >
                        {option.date}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Duration</Text>
              <View style={styles.durationRow}>
                {durationOptions.map((duration) => {
                  const active = activeDuration === duration;
                  return (
                    <Pressable
                      key={duration}
                      onPress={() => handleDurationPress(duration)}
                      style={[
                        styles.durationButton,
                        {
                          backgroundColor: active ? colors.primaryLight : colors.card,
                          borderColor: active ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.durationText,
                          { color: active ? colors.accent : colors.muted },
                        ]}
                      >
                        {duration} Mins
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Available Slots
              </Text>
            </View>
            <View style={styles.legendRow}>
              {(Object.keys(SLOT_STATUS_META) as SlotStatusKey[]).map((key) => (
                <LegendDot
                  key={key}
                  color={SLOT_STATUS_META[key].color}
                  label={SLOT_STATUS_META[key].label}
                />
              ))}
            </View>
            <View style={styles.slotGrid}>
              {visibleSlots.map((slot) => {
                const isSelected = selectedSlot === slot.id;
                const statusKey = slotStatus(slot);
                const statusMeta = SLOT_STATUS_META[statusKey];
                const bookable = isSlotBookable(slot);
                const full = statusKey === 'FULL';
                // Full slots stay tappable so players can join the waitlist.
                const unavailable = !bookable && !full;
                const capacity = slot.capacity ?? 1;
                const taken = occupiedSeats(slot);
                const seatsLeft = slot.availableSeats ?? Math.max(0, capacity - taken);
                const showSeats =
                  capacity > 1 && (statusKey === 'AVAILABLE' || statusKey === 'RESERVED');
                const fillRatio = capacity > 0 ? Math.min(1, taken / capacity) : 0;

                return (
                  <Pressable
                    key={slot.id}
                    disabled={unavailable}
                    onPress={() => setSelectedSlot(slot.id)}
                    style={[
                      styles.slot,
                      {
                        backgroundColor: isSelected
                          ? colors.accent
                          : statusKey === 'AVAILABLE'
                            ? colors.card
                            : `${statusMeta.color}1A`,
                        borderColor: isSelected ? colors.accent : statusMeta.color,
                        opacity: unavailable ? 0.56 : full && !isSelected ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.slotTime, { color: isSelected ? '#fff' : colors.foreground }]}
                    >
                      {formatSlotTime(slot.startTime)}
                    </Text>
                    <Text
                      style={[
                        styles.slotPrice,
                        { color: isSelected ? 'rgba(255,255,255,0.92)' : colors.muted },
                      ]}
                    >
                      {formatCurrency(Number(slot.price) || 0)}
                    </Text>
                    {showSeats && (
                      <>
                        <Text
                          style={[
                            styles.slotOccupancy,
                            { color: isSelected ? 'rgba(255,255,255,0.9)' : statusMeta.color },
                          ]}
                        >
                          {seatsLeft} left
                        </Text>
                        <View
                          style={[
                            styles.slotBarTrack,
                            {
                              backgroundColor: isSelected
                                ? 'rgba(255,255,255,0.28)'
                                : colors.mutedBg,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.slotBarFill,
                              {
                                width: `${Math.round(fillRatio * 100)}%`,
                                backgroundColor: isSelected ? '#fff' : statusMeta.color,
                              },
                            ]}
                          />
                        </View>
                      </>
                    )}
                    {statusKey !== 'AVAILABLE' && (
                      <Text
                        style={[styles.slotHint, { color: isSelected ? '#fff' : statusMeta.color }]}
                      >
                        {statusMeta.label}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
              {visibleSlots.length === 0 && (
                <Text style={[styles.empty, { color: colors.muted }]}>
                  No slots available for this date
                </Text>
              )}
            </View>

            <View
              style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Order Summary</Text>
              <SummaryRow
                label={`${courtSummaryLabel} (${selected ? slotDurationLabel(selected) : `${activeDuration} Mins`})`}
                value={selected ? formatCurrency(total) : '--'}
              />
              {selected && (selected.capacity ?? 1) > 1 && (
                <SummaryRow
                  label="Seats left"
                  value={String(
                    selected.availableSeats ??
                      Math.max(0, (selected.capacity ?? 1) - occupiedSeats(selected)),
                  )}
                />
              )}
              <SummaryRow label="Equipment Rental" value="Included" />
              <SummaryRow label="Platform Fee" value="Free" />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total Amount</Text>
                <Text style={[styles.totalValue, { color: colors.accent }]}>
                  {selected ? formatCurrency(total) : formatCurrency(0)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </QueryState>

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
                  ? 'Join Waitlist'
                  : selected
                    ? selectedIsBookable
                      ? 'Confirm & Pay'
                      : 'Unavailable'
                    : 'Select a slot'
          }
          disabled={
            !selected ||
            (!selectedIsBookable && !selectedIsFull) ||
            bookMutation.isPending ||
            waitlistMutation.isPending
          }
          onPress={() => {
            if (selectedIsFull) {
              waitlistMutation.mutate();
              return;
            }
            if (!selectedIsBookable) return;
            bookMutation.mutate();
          }}
          style={styles.payButton}
        />
      </View>
    </View>
  );
}

function CourtTile({
  active,
  emoji,
  imageUrl,
  label,
  sportColor,
  subtitle,
  onPress,
}: {
  active?: boolean;
  emoji: string;
  imageUrl?: string;
  label: string;
  sportColor: string;
  subtitle: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      <View style={styles.tileShade} />
      <View style={styles.tileText}>
        <Text style={styles.tileLabel} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.tileSubtitle}>{subtitle}</Text>
      </View>
      {active && (
        <View style={[styles.tileCheck, { backgroundColor: colors.accent }]}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
        </View>
      )}
      {!imageUrl && <Text style={styles.tileEmoji}>{emoji}</Text>}
    </>
  );

  const tileStyle = [
    styles.courtTile,
    {
      backgroundColor: `${sportColor}24`,
      borderColor: active ? colors.accent : colors.border,
      opacity: active ? 1 : 0.7,
    },
  ];

  if (imageUrl) {
    return (
      <Pressable onPress={onPress}>
        <ImageBackground source={{ uri: imageUrl }} style={tileStyle} imageStyle={styles.tileImage}>
          {content}
        </ImageBackground>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={tileStyle}>
      {content}
    </Pressable>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.xl, paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },
  section: { gap: Spacing.md },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '900' },
  sportText: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  monthText: { fontSize: FontSize.sm, fontWeight: '800' },
  courtGrid: { flexDirection: 'row', gap: Spacing.md },
  courtTile: {
    borderRadius: Radius.xl,
    borderWidth: 2,
    flex: 1,
    height: 184,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  tileImage: { resizeMode: 'cover' },
  tileShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  tileText: { padding: Spacing.md, position: 'relative', zIndex: 2 },
  tileLabel: { color: '#fff', fontSize: FontSize.lg, fontWeight: '900', lineHeight: 22 },
  tileSubtitle: { color: '#FFDB17', fontSize: FontSize.xs, fontWeight: '800', marginTop: 3 },
  tileCheck: {
    borderRadius: Radius.full,
    padding: 2,
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
    zIndex: 2,
  },
  tileEmoji: { fontSize: 58, position: 'absolute', right: 12, top: 34, zIndex: 1 },
  dateScroll: { marginHorizontal: -Spacing.xl, paddingHorizontal: Spacing.xl },
  dateRow: { flexDirection: 'row', gap: Spacing.md, paddingRight: Spacing.xl },
  dateCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    height: 82,
    justifyContent: 'center',
    width: 64,
  },
  dateDay: { fontSize: FontSize.xs, fontWeight: '800', textTransform: 'uppercase' },
  dateNumber: { fontSize: FontSize.xxl, fontWeight: '900', marginTop: 2 },
  durationRow: { flexDirection: 'row', gap: Spacing.sm },
  durationButton: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  durationText: { fontSize: FontSize.sm, fontWeight: '900' },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: -Spacing.md,
  },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  legendDot: { borderRadius: 3, height: 10, width: 10 },
  legendText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slot: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 72,
    paddingHorizontal: 6,
    paddingVertical: 8,
    width: '31.7%',
  },
  slotTime: { fontSize: FontSize.sm, fontWeight: '900', textAlign: 'center' },
  slotPrice: { fontSize: 10, fontWeight: '800' },
  slotOccupancy: { fontSize: 10, fontWeight: '800' },
  slotHint: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  slotBarTrack: {
    borderRadius: 2,
    height: 3,
    overflow: 'hidden',
    width: '80%',
  },
  slotBarFill: { borderRadius: 2, height: '100%' },
  empty: { paddingVertical: Spacing.xl, textAlign: 'center', width: '100%' },
  summary: { borderRadius: 28, borderWidth: 1, gap: Spacing.md, padding: Spacing.xl },
  summaryTitle: { fontSize: FontSize.xl, fontWeight: '900' },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  summaryLabel: { flex: 1, fontSize: FontSize.md, lineHeight: 21 },
  summaryValue: { fontSize: FontSize.md, fontWeight: '800' },
  divider: { height: 1, marginVertical: Spacing.xs },
  totalRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: FontSize.lg, fontWeight: '900' },
  totalValue: { fontSize: FontSize.xxl, fontWeight: '900' },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    position: 'absolute',
    right: 0,
  },
  footerLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  footerAmount: { fontSize: FontSize.xl, fontWeight: '900' },
  payButton: { minWidth: 174 },
});
