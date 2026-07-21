import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueries, useQuery } from '@tanstack/react-query';
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
import { QueryState } from '@/components/query-state';
import { SPORT_COLORS, SPORT_EMOJI } from '@/lib/constants';
import { getVenue } from '@/lib/venues';
import { getCourtSlots } from '@/lib/courts';
import { useVenueLive } from '@/hooks/use-venue-live';
import { useAuth } from '@/providers/auth-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type CourtWithCapacity = Court & { defaultSlotCapacity?: number | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function courtLabel(court: Court, index: number) {
  const match = court.name.match(/Court\s+(\d+)/i);
  if (match) return `Court ${match[1]}`;
  return `Court ${index + 1}`;
}

function priceOrFallback(value?: string | null) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : 499;
}

function courtSportSlug(court: Court) {
  if (court.sport?.slug) return court.sport.slug;
  if (typeof court.sportType === 'string') {
    return court.sportType.toLowerCase().replace(/_/g, '-');
  }
  return null;
}

function courtHighlights(court: Court): string[] {
  const amenities = court.amenities ?? [];
  const highlights: string[] = [];
  const indoor = amenities.find((a) => /indoor|outdoor/i.test(a));
  if (indoor) highlights.push(indoor);
  const ac = amenities.find((a) => /\bac\b|air.?condition/i.test(a));
  if (ac) highlights.push('AC');
  const surface = amenities.find((a) =>
    /wood|synthetic|turf|grass|clay|acrylic|mat\b|concrete|cushion/i.test(a),
  );
  if (surface && surface !== indoor) highlights.push(surface);
  return highlights.slice(0, 3);
}

function getPrimaryImage(court: Court) {
  const primary =
    court.images.find((img) => typeof img !== 'string' && img.isPrimary) ?? court.images[0];
  return typeof primary === 'string' ? primary : primary?.url;
}

function toLocalIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Color for each slot state in the mini-timeline */
function slotTimelineColor(slot: CourtSlot, _accentColor: string): string {
  const op = slot.operationalState;
  const st = slot.availabilityStatus;
  if (op === 'MAINTENANCE' || st === 'MAINTENANCE') return '#FFDB17';
  if (op === 'TOURNAMENT' || st === 'TOURNAMENT') return '#3B82F6';
  if (
    slot.isBlocked ||
    op === 'BLOCKED' ||
    op === 'CLOSED' ||
    op === 'PRIVATE' ||
    st === 'BLOCKED' ||
    st === 'CLOSED' ||
    st === 'PRIVATE' ||
    st === 'HOLIDAY'
  )
    return '#9CA3AF';
  if (
    slot.isBooked ||
    st === 'FULL' ||
    (typeof slot.availableSeats === 'number' && slot.availableSeats <= 0)
  )
    return '#EF4444';
  if (st === 'FEW_SPOTS' || (slot.reservedSeats ?? 0) > 0) return '#E8A317';
  return '#22C55E';
}

// ─── Mini-timeline bar ────────────────────────────────────────────────────────

function MiniTimeline({ slots, accentColor }: { slots: CourtSlot[]; accentColor: string }) {
  const { colors } = useTheme();

  if (slots.length === 0) {
    return (
      <View style={tlStyles.wrap}>
        <View style={[tlStyles.placeholder, { backgroundColor: colors.mutedBg }]}>
          <Text style={[tlStyles.placeholderText, { color: colors.muted }]}>No slots today</Text>
        </View>
      </View>
    );
  }

  // Sort by start time
  const sorted = [...slots].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  // Compute timeline span (first slot start → last slot end)
  const firstMs = new Date(sorted[0]!.startTime).getTime();
  const lastMs = new Date(sorted[sorted.length - 1]!.endTime).getTime();
  const totalMs = Math.max(lastMs - firstMs, 1);

  // Morning / afternoon / evening labels
  const labelsMs = [
    { label: '6AM', ms: new Date(sorted[0]!.startTime).setHours(6, 0, 0, 0) },
    { label: '12PM', ms: new Date(sorted[0]!.startTime).setHours(12, 0, 0, 0) },
    { label: '6PM', ms: new Date(sorted[0]!.startTime).setHours(18, 0, 0, 0) },
  ].filter((l) => l.ms >= firstMs && l.ms < lastMs);

  return (
    <View style={tlStyles.wrap}>
      {/* Time label strip */}
      <View style={tlStyles.labelRow}>
        {labelsMs.map((l) => (
          <Text
            key={l.label}
            style={[
              tlStyles.timeLabel,
              { color: colors.muted, left: `${Math.round(((l.ms - firstMs) / totalMs) * 100)}%` },
            ]}
          >
            {l.label}
          </Text>
        ))}
      </View>

      {/* Segment bar */}
      <View style={[tlStyles.bar, { backgroundColor: colors.mutedBg }]}>
        {sorted.map((slot) => {
          const startMs = new Date(slot.startTime).getTime();
          const endMs = new Date(slot.endTime).getTime();
          const left = ((startMs - firstMs) / totalMs) * 100;
          const width = Math.max(((endMs - startMs) / totalMs) * 100, 1);
          const color = slotTimelineColor(slot, accentColor);
          return (
            <View
              key={slot.id}
              style={[
                tlStyles.segment,
                {
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: color,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend */}
      <View style={tlStyles.legendRow}>
        {[
          { color: '#22C55E', label: 'Open' },
          { color: '#E8A317', label: 'Reserved' },
          { color: '#EF4444', label: 'Full' },
          { color: '#9CA3AF', label: 'Closed' },
          { color: '#3B82F6', label: 'Tournament' },
          { color: '#FFDB17', label: 'Maint.' },
        ].map((item) => (
          <View key={item.label} style={tlStyles.legendItem}>
            <View style={[tlStyles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[tlStyles.legendText, { color: colors.muted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  wrap: { marginTop: Spacing.sm },
  labelRow: {
    height: 14,
    position: 'relative',
    marginBottom: 2,
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '700',
    position: 'absolute',
    transform: [{ translateX: -10 }],
  },
  bar: {
    borderRadius: Radius.sm,
    height: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  segment: {
    borderRadius: 2,
    height: '100%',
    position: 'absolute',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 5,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  legendDot: {
    borderRadius: Radius.full,
    height: 6,
    width: 6,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '600',
  },
  placeholder: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  placeholderText: { fontSize: FontSize.xs },
});

// ─── Sport pill ───────────────────────────────────────────────────────────────

function SportPill({
  emoji,
  label,
  active,
  color,
  onPress,
}: {
  emoji: string;
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sportPill,
        {
          backgroundColor: active ? color : colors.card,
          borderColor: active ? color : colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={styles.sportPillEmoji}>{emoji}</Text>
      <Text style={[styles.sportPillLabel, { color: active ? '#fff' : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Court card ───────────────────────────────────────────────────────────────

function CourtCard({
  court,
  label,
  todaySlotsQuery,
  onBook,
}: {
  court: Court;
  label: string;
  todaySlotsQuery: { data?: CourtSlot[]; isLoading: boolean };
  onBook: () => void;
}) {
  const { colors } = useTheme();
  const sport: SportType = (court.sportType as SportType | null) ?? SportType.OTHER;
  const sportColor = SPORT_COLORS[sport];
  const capacity = (court as CourtWithCapacity).defaultSlotCapacity;
  const highlights = courtHighlights(court);
  const imageUrl = getPrimaryImage(court);

  // Availability summary
  const slots = todaySlotsQuery.data ?? [];
  const availableCount = slots.filter(
    (s) =>
      !s.isBlocked &&
      !s.isBooked &&
      s.availabilityStatus !== 'FULL' &&
      s.availabilityStatus !== 'BLOCKED' &&
      s.availabilityStatus !== 'CLOSED' &&
      (s.availableSeats == null || s.availableSeats > 0),
  ).length;

  const nextSlot = [...slots]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .find(
      (s) =>
        !s.isBlocked &&
        !s.isBooked &&
        s.availabilityStatus !== 'FULL' &&
        new Date(s.startTime).getTime() > Date.now(),
    );

  const nextSlotLabel = nextSlot
    ? new Date(nextSlot.startTime).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  return (
    <View style={[styles.courtCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Court image / sport tint header */}
      <View style={[styles.courtImageWrap, { backgroundColor: `${sportColor}22` }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.courtImage} resizeMode="cover" />
        ) : (
          <Text style={styles.courtImageEmoji}>{SPORT_EMOJI[sport]}</Text>
        )}
        {/* Indoor / Outdoor / AC badges */}
        <View style={styles.courtBadgesRow}>
          {highlights.map((h) => (
            <View key={h} style={[styles.courtBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
              <Text style={styles.courtBadgeText}>{h}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.courtCardBody}>
        {/* Title row */}
        <View style={styles.courtTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.courtCardName, { color: colors.foreground }]}>{label}</Text>
            <Text style={[styles.courtCardMeta, { color: colors.muted }]}>
              {SPORT_LABELS[sport]}
              {capacity != null && capacity > 1 ? ` · up to ${capacity}` : ''}
              {' · from '}
              {formatCurrency(priceOrFallback(court.defaultSlotPrice))}/hr
            </Text>
          </View>
          <Pressable
            onPress={onBook}
            style={({ pressed }) => [
              styles.bookNowBtn,
              { backgroundColor: sportColor, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Text style={styles.bookNowText}>Book</Text>
          </Pressable>
        </View>

        {/* Availability pills */}
        {!todaySlotsQuery.isLoading && slots.length > 0 && (
          <View style={styles.availRow}>
            {availableCount > 0 ? (
              <View style={[styles.availPill, { backgroundColor: '#22C55E22' }]}>
                <View style={[styles.availDot, { backgroundColor: '#22C55E' }]} />
                <Text style={[styles.availText, { color: '#16A34A' }]}>
                  {availableCount} slot{availableCount !== 1 ? 's' : ''} open today
                </Text>
              </View>
            ) : (
              <View style={[styles.availPill, { backgroundColor: '#EF444422' }]}>
                <View style={[styles.availDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.availText, { color: '#DC2626' }]}>Fully booked today</Text>
              </View>
            )}
            {nextSlotLabel && (
              <View style={[styles.availPill, { backgroundColor: colors.mutedBg }]}>
                <Ionicons name="time-outline" size={10} color={colors.muted} />
                <Text style={[styles.availText, { color: colors.muted }]}>
                  Next: {nextSlotLabel}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Mini timeline */}
        <MiniTimeline slots={slots} accentColor={sportColor} />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VenueDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [selectedSportSlug, setSelectedSportSlug] = useState<string | null>(null);
  const todayIso = toLocalIso(new Date());

  useVenueLive(id, token);

  const venueQuery = useQuery({
    queryKey: ['venue', id],
    queryFn: () => getVenue(id!),
    enabled: !!id,
  });

  const venue = venueQuery.data;

  const courts: Court[] = venue?.courts ?? [];
  const filteredCourts = selectedSportSlug
    ? courts.filter((c) => courtSportSlug(c) === selectedSportSlug)
    : courts;

  // Pre-fetch today's slots for each visible court so timeline shows immediately
  const courtSlotsResults = useQueries({
    queries: filteredCourts.map((c) => ({
      queryKey: ['slots', c.id, todayIso],
      queryFn: () => getCourtSlots(c.id, todayIso),
      enabled: !!c.id,
      staleTime: 30_000,
    })),
  });
  const courtSlotsQueries = filteredCourts.map((c, index) => ({
    courtId: c.id,
    query: courtSlotsResults[index] ?? { isLoading: false, data: [] as CourtSlot[] },
  }));

  const handleBook = useCallback(
    (courtId: string) => {
      router.push(`/booking/${courtId}`);
    },
    [router],
  );

  if (!venueQuery.isLoading && !venue) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.miniHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={() => router.back()} style={styles.roundButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🏟️</Text>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>
            This venue could not be loaded.
          </Text>
        </View>
      </View>
    );
  }

  const primarySport: SportType =
    (venue?.sports[0]?.slug?.toUpperCase().replace(/-/g, '_') as SportType | undefined) ??
    SportType.OTHER;
  const primarySportColor = SPORT_COLORS[primarySport];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <QueryState
        isLoading={venueQuery.isLoading}
        isError={venueQuery.isError}
        error={venueQuery.error as Error}
        onRetry={() => venueQuery.refetch()}
      >
        {venue && (
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxxl }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Hero ── */}
            <View style={[styles.hero, { backgroundColor: `${primarySportColor}25` }]}>
              <View style={[styles.heroChrome, { paddingTop: insets.top + Spacing.sm }]}>
                <Pressable onPress={() => router.back()} style={styles.roundButton}>
                  <Ionicons name="chevron-back" size={24} color={colors.foreground} />
                </Pressable>
              </View>
              <Text style={styles.heroEmoji}>{SPORT_EMOJI[primarySport]}</Text>
            </View>

            <View style={styles.content}>
              {/* Venue name + address */}
              <Text style={[styles.venueName, { color: colors.foreground }]}>{venue.name}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={15} color={colors.muted} />
                <Text style={[styles.metaText, { color: colors.muted }]} numberOfLines={1}>
                  {venue.city}
                  {venue.address ? ` · ${venue.address}` : ''}
                </Text>
              </View>

              {/* Venue-level amenities */}
              {venue.amenities.length > 0 && (
                <Text style={[styles.amenities, { color: colors.muted }]}>
                  {venue.amenities.slice(0, 6).join(' · ')}
                </Text>
              )}

              {/* ── Sport Picker ── */}
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose Sport</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sportPillRow}
              >
                <SportPill
                  emoji="🏟️"
                  label="All"
                  active={selectedSportSlug === null}
                  color={colors.accent}
                  onPress={() => setSelectedSportSlug(null)}
                />
                {venue.sports.map((s) => {
                  const sType = s.slug?.toUpperCase().replace(/-/g, '_') as SportType | undefined;
                  const sColor = sType ? SPORT_COLORS[sType] : colors.accent;
                  const sEmoji = sType ? SPORT_EMOJI[sType] : '🏅';
                  return (
                    <SportPill
                      key={s.id}
                      emoji={sEmoji}
                      label={s.name}
                      active={selectedSportSlug === s.slug}
                      color={sColor}
                      onPress={() =>
                        setSelectedSportSlug((cur) => (cur === s.slug ? null : s.slug))
                      }
                    />
                  );
                })}
              </ScrollView>

              {/* ── Courts ── */}
              <View style={styles.courtListHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  {filteredCourts.length === 1 ? '1 court' : `${filteredCourts.length} courts`}
                </Text>
                <Text style={[styles.todayLabel, { color: colors.muted }]}>Today's timeline</Text>
              </View>

              <View style={styles.courtList}>
                {filteredCourts.map((court, index) => {
                  const slotQ = courtSlotsQueries.find((q) => q.courtId === court.id);
                  return (
                    <CourtCard
                      key={court.id}
                      court={court}
                      label={courtLabel(court, index)}
                      todaySlotsQuery={slotQ?.query ?? { isLoading: false, data: [] }}
                      onBook={() => handleBook(court.id)}
                    />
                  );
                })}
                {filteredCourts.length === 0 && (
                  <View
                    style={[
                      styles.emptyCourts,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={styles.emptyCourtsEmoji}>🔍</Text>
                    <Text style={[styles.emptyCourtsText, { color: colors.muted }]}>
                      No courts for this sport at this venue.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </QueryState>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // header
  miniHeader: { paddingHorizontal: Spacing.lg },
  roundButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },

  // not found
  notFound: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: Spacing.xl },
  notFoundEmoji: { fontSize: 48, marginBottom: Spacing.md },
  notFoundText: { fontSize: FontSize.md, fontWeight: '600', textAlign: 'center' },

  // hero
  hero: { height: 200, justifyContent: 'flex-end', paddingBottom: Spacing.xl },
  heroChrome: { left: Spacing.lg, position: 'absolute', top: 0 },
  heroEmoji: { alignSelf: 'center', fontSize: 64 },

  // content
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  venueName: { fontSize: FontSize.xxl, fontWeight: '900' },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: Spacing.xs,
  },
  metaText: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  amenities: { fontSize: FontSize.xs, fontWeight: '600', marginTop: Spacing.sm },

  // sport picker
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '900', marginTop: Spacing.xl },
  sportPillRow: { gap: Spacing.sm, paddingVertical: Spacing.md },
  sportPill: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sportPillEmoji: { fontSize: 16 },
  sportPillLabel: { fontSize: FontSize.sm, fontWeight: '800' },

  // courts section
  courtListHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  todayLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  courtList: { gap: Spacing.lg, marginTop: Spacing.md, paddingBottom: Spacing.lg },

  // court card
  courtCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  courtImageWrap: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  courtImage: {
    height: '100%',
    width: '100%',
  },
  courtImageEmoji: { fontSize: 52 },
  courtBadgesRow: {
    bottom: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
    left: Spacing.sm,
    position: 'absolute',
  },
  courtBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  courtBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  courtCardBody: { padding: Spacing.md },
  courtTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  courtCardName: { fontSize: FontSize.md, fontWeight: '900' },
  courtCardMeta: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },

  bookNowBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  bookNowText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '900' },

  // availability pills
  availRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  availPill: {
    alignItems: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  availDot: { borderRadius: Radius.full, height: 6, width: 6 },
  availText: { fontSize: 10, fontWeight: '700' },

  // empty courts
  emptyCourts: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyCourtsEmoji: { fontSize: 32 },
  emptyCourtsText: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },
});
