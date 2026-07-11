import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPORT_LABELS, type SportType } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { SearchBar } from '@/components/search-bar';
import { CourtCard } from '@/components/court-card';
import { QueryState } from '@/components/query-state';
import { SPORT_EMOJI, CITIES, POPULAR_SPORTS } from '@/lib/constants';
import { getCourts } from '@/lib/courts';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<SportType | null>(null);
  const [city, setCity] = useState<string | null>(null);

  const courtsQuery = useQuery({
    queryKey: ['courts', 'search', query, sport, city],
    queryFn: () =>
      getCourts({
        search: query || undefined,
        sportType: sport ?? undefined,
        city: city ?? undefined,
      }),
  });

  const results = useMemo(() => courtsQuery.data?.items ?? [], [courtsQuery.data]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Find venues</Text>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search courts, cities…" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <View style={styles.filterRow}>
          <FilterChip label="All sports" active={!sport} onPress={() => setSport(null)} />
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <View style={styles.filterRow}>
          <FilterChip label="All cities" active={!city} onPress={() => setCity(null)} />
          {CITIES.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={city === c}
              onPress={() => setCity(city === c ? null : c)}
            />
          ))}
        </View>
      </ScrollView>

      <QueryState
        isLoading={courtsQuery.isLoading}
        isError={courtsQuery.isError}
        error={courtsQuery.error as Error}
        onRetry={() => courtsQuery.refetch()}
      >
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.muted }]}>
              {courtsQuery.data?.total ?? results.length} venue
              {(courtsQuery.data?.total ?? results.length) !== 1 ? 's' : ''} found
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <CourtCard court={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No venues found</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Try adjusting your filters or search term
              </Text>
            </View>
          }
        />
      </QueryState>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.chipLabel, { color: active ? colors.primaryForeground : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.hero, fontWeight: '800' },
  filters: { maxHeight: 44, marginBottom: Spacing.sm },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  cardWrap: { marginBottom: Spacing.md },
  resultCount: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center' },
});
