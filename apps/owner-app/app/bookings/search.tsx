import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { BookingCard, type BookingCardData } from '@/components/booking-card';
import { BookingSkeletonList } from '@/components/booking-skeleton';
import { getMyCourts, getOwnerBookingsFiltered, type OwnerBookingRow } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = '' | 'CONFIRMED' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
type SourceFilter = '' | 'OWNER_WALK_IN' | 'PLAYER_APP';

// ─── Helper ───────────────────────────────────────────────────────────────────

function rowToCard(row: OwnerBookingRow): BookingCardData {
  return {
    id: row.id,
    status: row.status,
    bookingType: row.bookingType,
    totalAmount: row.totalAmount,
    date: row.slot?.startTime ?? row.createdAt,
    court: row.court
      ? { id: row.court.id, name: row.court.name, sport: row.court.sportType }
      : undefined,
    user: row.user,
    slot: row.slot,
    seats: row.seats,
  };
}

// ─── Chip component ───────────────────────────────────────────────────────────

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
      <Text style={[styles.chipText, { color: active ? '#fff' : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookingSearchScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [source, setSource] = useState<SourceFilter>('');
  const [courtId, setCourtId] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onChangeText = useCallback((text: string) => {
    setRawSearch(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(text), 400);
  }, []);

  const onClear = useCallback(() => {
    setRawSearch('');
    setSearch('');
  }, []);

  // ── Courts for court filter ────────────────────────────────────────────────
  const courtsQuery = useQuery({
    queryKey: ['owner', 'courts'],
    queryFn: () => getMyCourts(token!, 1),
    enabled: !!token,
  });

  // ── Results query ──────────────────────────────────────────────────────────
  const hasFilter = search.length >= 2 || status !== '' || source !== '' || courtId !== '';

  const resultsQuery = useQuery({
    queryKey: ['owner', 'bookings', 'search', search, status, source, courtId],
    queryFn: () =>
      getOwnerBookingsFiltered(token!, {
        search: search || undefined,
        status: status || undefined,
        bookingSource: source || undefined,
        courtId: courtId || undefined,
        pageSize: 30,
      }),
    enabled: !!token && hasFilter,
  });

  const results: BookingCardData[] = hasFilter
    ? (resultsQuery.data?.items ?? []).map(rowToCard)
    : [];

  const handleCardPress = useCallback(
    (id: string) => router.push({ pathname: '/bookings/[id]' as never, params: { id } }),
    [router],
  );

  const STATUS_OPTIONS: Array<{ label: string; value: StatusFilter }> = [
    { label: 'All', value: '' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const SOURCE_OPTIONS: Array<{ label: string; value: SourceFilter }> = [
    { label: 'All', value: '' },
    { label: 'Walk-in', value: 'OWNER_WALK_IN' },
    { label: 'Player App', value: 'PLAYER_APP' },
  ];

  const courts = courtsQuery.data?.items ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Fixed search header */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.mutedBg, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.muted} />
          <TextInput
            autoFocus
            value={rawSearch}
            onChangeText={onChangeText}
            placeholder="Search name, ID, phone…"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {rawSearch.length > 0 && (
            <Pressable onPress={onClear}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={hasFilter && !resultsQuery.isLoading ? results : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BookingCard booking={item} onPress={handleCardPress} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Status filter ── */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.muted }]}>STATUS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {STATUS_OPTIONS.map((o) => (
                  <FilterChip
                    key={o.value || 'all-status'}
                    label={o.label}
                    active={status === o.value}
                    onPress={() => setStatus(o.value)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* ── Source filter ── */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.muted }]}>SOURCE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <FilterChip
                    key={o.value || 'all-source'}
                    label={o.label}
                    active={source === o.value}
                    onPress={() => setSource(o.value)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* ── Court filter ── */}
            {courts.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.muted }]}>COURT</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  <FilterChip label="All" active={courtId === ''} onPress={() => setCourtId('')} />
                  {courts.map((c) => (
                    <FilterChip
                      key={c.id}
                      label={c.name}
                      active={courtId === c.id}
                      onPress={() => setCourtId(c.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Divider + results count ── */}
            {hasFilter && !resultsQuery.isLoading && (
              <Text style={[styles.resultsCount, { color: colors.muted }]}>
                {results.length} result{results.length !== 1 ? 's' : ''}
              </Text>
            )}

            {/* ── Skeleton ── */}
            {hasFilter && resultsQuery.isLoading && (
              <View style={{ marginTop: Spacing.sm }}>
                <BookingSkeletonList count={4} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !resultsQuery.isLoading && hasFilter ? (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={40} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
              <Text style={[styles.emptyBody, { color: colors.muted }]}>
                Try a different name, booking ID, or phone number.
              </Text>
            </View>
          ) : !hasFilter ? (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={40} color={colors.muted} />
              <Text style={[styles.emptyBody, { color: colors.muted }]}>
                Type to search, or select a filter above.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.sm,
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: Spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    padding: 0,
  },

  // Filters
  filterSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },

  // Results count
  resultsCount: {
    fontSize: FontSize.xs,
    marginTop: Spacing.lg,
    marginBottom: -Spacing.xs,
  },

  // Empty
  emptyBox: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    maxWidth: 260,
  },
});
