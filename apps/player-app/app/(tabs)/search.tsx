import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPORT_LABELS, type SportType } from '@fitora/shared';
import { VenueCard } from '@/components/venue-card';
import { QueryState } from '@/components/query-state';
import { useTheme } from '@/providers/theme-provider';
import { CITIES, POPULAR_SPORTS, SPORT_EMOJI } from '@/lib/constants';
import { getVenues } from '@/lib/venues';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<SportType | null>(POPULAR_SPORTS[0] ?? null);
  const [city, setCity] = useState<string | null>('Hyderabad');

  const venuesQuery = useQuery({
    queryKey: ['venues', 'search', query, sport, city],
    queryFn: () =>
      getVenues({
        search: query.trim() || undefined,
        sportType: sport ?? undefined,
        city: city ?? undefined,
      }),
  });

  const results = useMemo(() => venuesQuery.data?.items ?? [], [venuesQuery.data]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + Spacing.lg, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.locationWrap}>
          <Ionicons name="location" size={17} color={colors.accent} />
          <Text style={[styles.locationText, { color: colors.foreground }]}>
            {city ?? 'All cities'}
          </Text>
        </View>
        <Text style={[styles.brand, { color: colors.primary }]}>FitOra</Text>
        <View style={[styles.headerIcon, { backgroundColor: colors.card }]}>
          <Ionicons name="filter-outline" size={21} color={colors.primary} />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.topContent}>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={20} color={colors.muted} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setQuery}
                placeholder="Search courts, sports or location"
                placeholderTextColor={colors.muted}
                style={[styles.searchInput, { color: colors.foreground }]}
                value={query}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              <View style={styles.categoryRow}>
                {POPULAR_SPORTS.map((item) => {
                  const active = sport === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setSport(active ? null : item)}
                      style={styles.categoryItem}
                    >
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: active ? colors.accent : colors.mutedBg },
                        ]}
                      >
                        <Text style={styles.categoryEmoji}>{SPORT_EMOJI[item]}</Text>
                      </View>
                      <Text
                        style={[
                          styles.categoryLabel,
                          { color: active ? colors.accent : colors.muted },
                        ]}
                      >
                        {SPORT_LABELS[item]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              <View style={styles.cityRow}>
                <FilterChip label="All cities" active={!city} onPress={() => setCity(null)} />
                {CITIES.map((item) => (
                  <FilterChip
                    key={item}
                    label={item}
                    active={city === item}
                    onPress={() => setCity(city === item ? null : item)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Nearby Venues
                </Text>
                <Text style={[styles.resultCount, { color: colors.muted }]}>
                  {venuesQuery.data?.total ?? results.length} venues found
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <QueryState
            isLoading={venuesQuery.isLoading}
            isError={venuesQuery.isError}
            error={venuesQuery.error as Error}
            onRetry={() => venuesQuery.refetch()}
          >
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.mutedBg }]}>
                <Ionicons name="search" size={40} color={colors.muted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No venues found</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Try another sport, city, or venue name.
              </Text>
            </View>
          </QueryState>
        }
        renderItem={({ item }) => (
          <QueryState
            isLoading={venuesQuery.isLoading}
            isError={venuesQuery.isError}
            error={venuesQuery.error as Error}
            onRetry={() => venuesQuery.refetch()}
          >
            <VenueCard venue={item} />
          </QueryState>
        )}
      />
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
          backgroundColor: active ? colors.accent : colors.card,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}
    >
      <Text style={[styles.chipLabel, { color: active ? '#fff' : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  locationWrap: { alignItems: 'center', flexDirection: 'row', gap: 5, minWidth: 88 },
  locationText: { fontSize: FontSize.sm, fontWeight: '900' },
  brand: { fontSize: FontSize.xxl, fontWeight: '900' },
  headerIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  list: { gap: Spacing.lg, paddingHorizontal: Spacing.xl },
  topContent: { gap: Spacing.xl, paddingBottom: Spacing.xs },
  searchBox: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    height: 56,
    paddingHorizontal: Spacing.lg,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, fontWeight: '700' },
  horizontalScroll: { marginHorizontal: -Spacing.xl, paddingHorizontal: Spacing.xl },
  categoryRow: { flexDirection: 'row', gap: Spacing.lg, paddingRight: Spacing.xl },
  categoryItem: { alignItems: 'center', gap: Spacing.sm, width: 78 },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  categoryEmoji: { fontSize: 25 },
  categoryLabel: { fontSize: FontSize.xs, fontWeight: '900', textAlign: 'center' },
  cityRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.xl },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipLabel: { fontSize: FontSize.sm, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '900' },
  resultCount: { fontSize: FontSize.sm, fontWeight: '700', marginTop: 3 },
  empty: { alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingTop: 72 },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 96,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    width: 96,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '900' },
  emptyText: { fontSize: FontSize.md, lineHeight: 22, marginTop: Spacing.sm, textAlign: 'center' },
});
