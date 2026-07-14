import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPORT_LABELS, type SportType } from '@fitora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { CourtCard } from '@/components/court-card';
import { QueryState } from '@/components/query-state';
import { SPORT_EMOJI, CITIES, POPULAR_SPORTS } from '@/lib/constants';
import { getCourts } from '@/lib/courts';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const EVENTS_MOCK = [
  { emoji: '🏸', sport: 'Badminton', title: 'Hyderabad Badminton Open', date: 'Sat 19 Jul', venue: 'Smash Arena', fee: '₹500' },
  { emoji: '⚽', sport: 'Football', title: 'Gachibowli 5-a-Side Cup', date: 'Sun 20 Jul', venue: 'Greenfield FC', fee: '₹300' },
];

const ACADEMIES_MOCK = [
  { initials: 'KA', name: 'KPHB Badminton Academy', sport: 'Badminton', age: 'U-14 & Adults', fee: '₹2,000/mo', color: '#059669' },
  { initials: 'CA', name: 'City Cricket Academy', sport: 'Cricket', age: 'U-16 & Adults', fee: '₹2,500/mo', color: '#2563EB' },
];

export default function ExploreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<SportType | null>(null);

  const courtsQuery = useQuery({
    queryKey: ['courts', 'search', query, sport],
    queryFn: () => getCourts({ search: query || undefined, sportType: sport ?? undefined }),
  });

  const results = useMemo(() => courtsQuery.data?.items ?? [], [courtsQuery.data]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Search bar */}
      <View style={[styles.searchSection, { paddingTop: insets.top + Spacing.md, backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <Text style={[styles.searchPlaceholder, { color: colors.muted }]}>
            {query || 'Search venues, sports, events...'}
          </Text>
          <Ionicons name="options-outline" size={18} color={colors.muted} />
        </View>
      </View>

      {/* Sport filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          <FilterChip label="All" active={!sport} onPress={() => setSport(null)} />
          {POPULAR_SPORTS.map((s) => (
            <FilterChip
              key={s}
              label={`${SPORT_EMOJI[s]} ${SPORT_LABELS[s]}`}
              active={sport === s}
              onPress={() => setSport(sport === s ? null : s)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.content}>
        {/* Trending Venues */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending Near You</Text>
            <Text style={[styles.resultCount, { color: colors.muted }]}>
              {courtsQuery.data?.total ?? results.length} venues
            </Text>
          </View>
          <QueryState
            isLoading={courtsQuery.isLoading}
            isError={courtsQuery.isError}
            error={courtsQuery.error as Error}
            onRetry={() => courtsQuery.refetch()}
          >
            <View style={styles.venueList}>
              {results.slice(0, 6).map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
              {results.length === 0 && !courtsQuery.isLoading && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🔍</Text>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No venues found</Text>
                  <Text style={[styles.emptyText, { color: colors.muted }]}>Try adjusting your filters</Text>
                </View>
              )}
            </View>
          </QueryState>
        </View>

        {/* Upcoming Events */}
        <View style={styles.sectionGap}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Upcoming Events</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.eventsRow}>
              {EVENTS_MOCK.map((ev, i) => (
                <View key={i} style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.eventBanner, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.eventEmoji}>{ev.emoji}</Text>
                  </View>
                  <View style={styles.eventBody}>
                    <View style={[styles.sportPill, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.sportPillText, { color: colors.primary }]}>{ev.sport}</Text>
                    </View>
                    <Text style={[styles.eventTitle, { color: colors.foreground }]}>{ev.title}</Text>
                    <Text style={[styles.eventMeta, { color: colors.muted }]}>{ev.date} · {ev.venue}</Text>
                    <Pressable style={[styles.registerBtn, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.registerBtnText, { color: colors.primaryForeground }]}>
                        Register {ev.fee}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Academies */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Academies Near You</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.academiesRow}>
              {ACADEMIES_MOCK.map((ac, i) => (
                <View key={i} style={[styles.academyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.academyAvatar, { backgroundColor: ac.color }]}>
                    <Text style={styles.academyAvatarText}>{ac.initials}</Text>
                  </View>
                  <Text style={[styles.academyName, { color: colors.foreground }]}>{ac.name}</Text>
                  <Text style={[styles.academyMeta, { color: colors.muted }]}>{ac.sport} · {ac.age}</Text>
                  <Text style={[styles.academyFee, { color: colors.primary }]}>{ac.fee}</Text>
                  <Pressable style={[styles.enrollBtn, { borderColor: colors.primary }]}>
                    <Text style={[styles.enrollBtnText, { color: colors.primary }]}>Enroll</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
    >
      <Text style={[styles.chipLabel, { color: active ? colors.primaryForeground : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchSection: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  searchPlaceholder: { flex: 1, fontSize: FontSize.md },
  chipsScroll: { marginBottom: Spacing.md },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingRight: Spacing.xxl },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1 },
  chipLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.lg },
  sectionGap: { marginBottom: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  resultCount: { fontSize: FontSize.sm },
  venueList: { gap: Spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: Spacing.sm },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center' },

  // Events
  eventsRow: { flexDirection: 'row', gap: Spacing.md, paddingRight: Spacing.lg },
  eventCard: { width: 220, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  eventBanner: { height: 100, alignItems: 'center', justifyContent: 'center' },
  eventEmoji: { fontSize: 44 },
  eventBody: { padding: Spacing.md, gap: 6 },
  sportPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  sportPillText: { fontSize: FontSize.xs, fontWeight: '700' },
  eventTitle: { fontSize: FontSize.md, fontWeight: '700' },
  eventMeta: { fontSize: FontSize.xs },
  registerBtn: { marginTop: 4, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  registerBtnText: { fontSize: FontSize.sm, fontWeight: '700' },

  // Academies
  academiesRow: { flexDirection: 'row', gap: Spacing.md, paddingRight: Spacing.lg },
  academyCard: { width: 176, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 4 },
  academyAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  academyAvatarText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  academyName: { fontSize: FontSize.sm, fontWeight: '700' },
  academyMeta: { fontSize: FontSize.xs },
  academyFee: { fontSize: FontSize.sm, fontWeight: '700' },
  enrollBtn: { marginTop: Spacing.sm, height: 34, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  enrollBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
});
