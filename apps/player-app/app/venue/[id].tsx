import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPORT_LABELS, SportType, formatCurrency, type Court } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { SPORT_COLORS, SPORT_EMOJI } from '@/lib/constants';
import { getVenue } from '@/lib/venues';
import { useVenueLive } from '@/hooks/use-venue-live';
import { useAuth } from '@/providers/auth-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type CourtWithCapacity = Court & { defaultSlotCapacity?: number | null };

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

/** Pull indoor / AC / surface highlights out of the free-form amenities list. */
function courtHighlights(court: Court) {
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

export default function VenueDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [selectedSportSlug, setSelectedSportSlug] = useState<string | null>(null);

  useVenueLive(id, token);

  const venueQuery = useQuery({
    queryKey: ['venue', id],
    queryFn: () => getVenue(id!),
    enabled: !!id,
  });

  const venue = venueQuery.data;

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

  const sport: SportType =
    (venue?.sports[0]?.slug?.toUpperCase().replace(/-/g, '_') as SportType | undefined) ??
    SportType.OTHER;
  const sportColor = SPORT_COLORS[sport];
  const courts = venue?.courts ?? [];
  const filteredCourts = selectedSportSlug
    ? courts.filter((court) => courtSportSlug(court) === selectedSportSlug)
    : courts;

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
            <View style={[styles.hero, { backgroundColor: `${sportColor}25` }]}>
              <View style={[styles.heroChrome, { paddingTop: insets.top + Spacing.sm }]}>
                <Pressable onPress={() => router.back()} style={styles.roundButton}>
                  <Ionicons name="chevron-back" size={24} color={colors.foreground} />
                </Pressable>
              </View>
              <Text style={styles.heroEmoji}>{SPORT_EMOJI[sport]}</Text>
            </View>

            <View style={styles.content}>
              <Text style={[styles.venueName, { color: colors.foreground }]}>{venue.name}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={colors.muted} />
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {venue.city} · {venue.address}
                </Text>
              </View>

              <View style={styles.chips}>
                <SportChip
                  active={selectedSportSlug === null}
                  label="All"
                  onPress={() => setSelectedSportSlug(null)}
                />
                {venue.sports.map((s) => (
                  <SportChip
                    key={s.id}
                    active={selectedSportSlug === s.slug}
                    label={s.name}
                    onPress={() =>
                      setSelectedSportSlug((current) => (current === s.slug ? null : s.slug))
                    }
                  />
                ))}
                <Badge label={venue.courtCount === 1 ? '1 court' : `${venue.courtCount} courts`} />
              </View>

              {venue.amenities.length > 0 && (
                <Text style={[styles.amenities, { color: colors.muted }]}>
                  {venue.amenities.slice(0, 6).join(' · ')}
                </Text>
              )}

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Choose a court
              </Text>
              <Text style={[styles.sectionSub, { color: colors.muted }]}>
                Availability and slots are per court
              </Text>

              <View style={styles.courtList}>
                {filteredCourts.map((court, index) => (
                  <CourtPickRow
                    key={court.id}
                    court={court}
                    label={courtLabel(court, index)}
                    onBook={() => router.push(`/booking/${court.id}`)}
                  />
                ))}
                {filteredCourts.length === 0 && (
                  <Text style={[styles.emptyCourts, { color: colors.muted }]}>
                    No courts for this sport at this venue.
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </QueryState>
    </View>
  );
}

function SportChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sportChip,
        {
          backgroundColor: active ? colors.accent : colors.mutedBg,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}
    >
      <Text style={[styles.sportChipText, { color: active ? '#fff' : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

function CourtPickRow({
  court,
  label,
  onBook,
}: {
  court: Court;
  label: string;
  onBook: () => void;
}) {
  const { colors } = useTheme();
  const sport: SportType = (court.sportType as SportType | null) ?? SportType.OTHER;
  const sportColor = SPORT_COLORS[sport];
  const capacity = (court as CourtWithCapacity).defaultSlotCapacity;
  const highlights = courtHighlights(court);

  return (
    <View style={[styles.courtRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.courtIcon, { backgroundColor: `${sportColor}22` }]}>
        <Text style={styles.courtEmoji}>{SPORT_EMOJI[sport]}</Text>
      </View>
      <View style={styles.courtBody}>
        <Text style={[styles.courtName, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.courtMeta, { color: colors.muted }]}>
          {SPORT_LABELS[sport]} · from {formatCurrency(priceOrFallback(court.defaultSlotPrice))}/hr
          {capacity != null && capacity > 1 ? ` · up to ${capacity} players` : ''}
        </Text>
        {highlights.length > 0 && (
          <Text style={[styles.courtHighlights, { color: colors.muted }]} numberOfLines={1}>
            {highlights.join(' · ')}
          </Text>
        )}
      </View>
      <Pressable
        onPress={onBook}
        style={({ pressed }) => [
          styles.bookBtn,
          { backgroundColor: colors.accent },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.bookBtnText}>Book</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  miniHeader: { paddingHorizontal: Spacing.lg },
  roundButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  notFound: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: Spacing.xl },
  notFoundEmoji: { fontSize: 48, marginBottom: Spacing.md },
  notFoundText: { fontSize: FontSize.md, fontWeight: '600', textAlign: 'center' },
  hero: { height: 220, justifyContent: 'flex-end', paddingBottom: Spacing.xl },
  heroChrome: { left: Spacing.lg, position: 'absolute', top: 0 },
  heroEmoji: { alignSelf: 'center', fontSize: 72 },
  content: { padding: Spacing.lg },
  venueName: { fontSize: FontSize.xxl, fontWeight: '900' },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: Spacing.sm },
  meta: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  amenities: { fontSize: FontSize.sm, fontWeight: '600', marginTop: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '900', marginTop: Spacing.xl },
  sectionSub: { fontSize: FontSize.sm, fontWeight: '600', marginTop: 4 },
  courtList: { gap: Spacing.md, marginTop: Spacing.lg },
  courtRow: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  courtIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  courtEmoji: { fontSize: 24 },
  courtBody: { flex: 1 },
  courtName: { fontSize: FontSize.md, fontWeight: '900' },
  courtMeta: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  courtHighlights: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2, opacity: 0.85 },
  emptyCourts: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    paddingVertical: Spacing.lg,
    textAlign: 'center',
  },
  sportChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  sportChipText: { fontSize: FontSize.xs, fontWeight: '800' },
  bookBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  bookBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '900' },
});
