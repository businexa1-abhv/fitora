import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPORT_LABELS, SportType, formatCurrency } from '@fitora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { CourtCard } from '@/components/court-card';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { SPORT_EMOJI, POPULAR_SPORTS } from '@/lib/constants';
import { getCourts, getMyBookings } from '@/lib/courts';
import { useAuth } from '@/providers/auth-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const DATES = ['Today', 'Tomorrow', 'Wed 16', 'Thu 17', 'Fri 18'];

const OPEN_GAMES_MOCK = [
  { sport: '🏸', title: '4v4 Badminton', venue: 'Smash Arena', time: '8:00 PM', spots: 3 },
  { sport: '⚽', title: '5-a-Side Football', venue: 'Greenfield FC', time: '7:00 PM', spots: 2 },
  { sport: '🏏', title: 'Cricket Net Practice', venue: 'City Cricket Club', time: '6:00 AM', spots: 5 },
];

export default function PlayScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<SportType>(SportType.BADMINTON);
  const [selectedDate, setSelectedDate] = useState(0);

  const courtsQuery = useQuery({
    queryKey: ['courts', 'play', selectedSport],
    queryFn: () => getCourts({ sportType: selectedSport }),
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'upcoming', 'play'],
    queryFn: () => getMyBookings(token!, 1, 'CONFIRMED'),
    enabled: !!token,
  });

  const upcoming = bookingsQuery.data?.items ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Play</Text>
      </View>

      <View style={styles.content}>
        {/* Book a Court */}
        <View style={styles.sectionGap}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Book a Court</Text>

          {/* Sport selector grid */}
          <Text style={[styles.subLabel, { color: colors.muted }]}>Select Sport</Text>
          <View style={styles.sportGrid}>
            {POPULAR_SPORTS.map((sport) => {
              const active = selectedSport === sport;
              return (
                <Pressable
                  key={sport}
                  onPress={() => setSelectedSport(sport)}
                  style={[
                    styles.sportCell,
                    {
                      backgroundColor: active ? colors.primaryLight : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.sportCellEmoji}>{SPORT_EMOJI[sport]}</Text>
                  <Text style={[styles.sportCellLabel, { color: active ? colors.primary : colors.foreground }]}>
                    {SPORT_LABELS[sport]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Date chips */}
          <Text style={[styles.subLabel, { color: colors.muted }]}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateRow}>
              {DATES.map((d, i) => (
                <Pressable
                  key={d}
                  onPress={() => setSelectedDate(i)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: selectedDate === i ? colors.primary : colors.card,
                      borderColor: selectedDate === i ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.dateChipText, { color: selectedDate === i ? colors.primaryForeground : colors.foreground }]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Venue results */}
          <QueryState
            isLoading={courtsQuery.isLoading}
            isError={courtsQuery.isError}
            error={courtsQuery.error as Error}
            onRetry={() => courtsQuery.refetch()}
          >
            <View style={styles.venueList}>
              {courtsQuery.data?.items.slice(0, 4).map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </View>
          </QueryState>
        </View>

        {/* My Upcoming Games */}
        {upcoming.length > 0 && (
          <View style={styles.sectionGap}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Upcoming Games</Text>
              <Pressable onPress={() => router.push('/bookings')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.bookingList}>
              {upcoming.slice(0, 2).map((b) => (
                <View key={b.id} style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.bookingIcon, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.bookingIconEmoji}>
                      {b.court?.sportType ? SPORT_EMOJI[b.court.sportType as SportType] : '🏟️'}
                    </Text>
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={[styles.bookingVenue, { color: colors.foreground }]}>{b.court?.name}</Text>
                    <Text style={[styles.bookingMeta, { color: colors.muted }]}>
                      {b.slot ? new Date(b.slot.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.qrBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/booking/${b.id}`)}
                  >
                    <Ionicons name="qr-code" size={16} color={colors.primaryForeground} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Open Games */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Open Games</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.openGamesRow}>
              {OPEN_GAMES_MOCK.map((g, i) => (
                <View key={i} style={[styles.openGameCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.openGameEmoji}>{g.sport}</Text>
                  <Text style={[styles.openGameTitle, { color: colors.foreground }]}>{g.title}</Text>
                  <Text style={[styles.openGameMeta, { color: colors.muted }]}>{g.venue}</Text>
                  <Text style={[styles.openGameTime, { color: colors.muted }]}>{g.time}</Text>
                  <View style={[styles.spotsChip, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '700' }}>{g.spots} spots left</Text>
                  </View>
                  <Pressable style={[styles.joinBtn, { borderColor: colors.primary }]}>
                    <Text style={[styles.joinBtnText, { color: colors.primary }]}>Join</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.hero, fontWeight: '800' },
  content: { paddingHorizontal: Spacing.lg },
  sectionGap: { marginBottom: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md },
  subLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm },
  seeAll: { fontSize: FontSize.sm, fontWeight: '700' },

  // Sport grid
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  sportCell: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sportCellEmoji: { fontSize: 28 },
  sportCellLabel: { fontSize: FontSize.xs, fontWeight: '700', textAlign: 'center' },

  // Date chips
  dateRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, paddingRight: Spacing.lg },
  dateChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5 },
  dateChipText: { fontSize: FontSize.sm, fontWeight: '700' },

  venueList: { gap: Spacing.md },

  // Booking cards
  bookingList: { gap: Spacing.sm },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  bookingIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  bookingIconEmoji: { fontSize: 24 },
  bookingInfo: { flex: 1 },
  bookingVenue: { fontSize: FontSize.md, fontWeight: '700' },
  bookingMeta: { fontSize: FontSize.sm, marginTop: 2 },
  qrBtn: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },

  // Open games
  openGamesRow: { flexDirection: 'row', gap: Spacing.md, paddingRight: Spacing.lg },
  openGameCard: { width: 160, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 4 },
  openGameEmoji: { fontSize: 28, marginBottom: 4 },
  openGameTitle: { fontSize: FontSize.sm, fontWeight: '700' },
  openGameMeta: { fontSize: FontSize.xs },
  openGameTime: { fontSize: FontSize.xs },
  spotsChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, marginTop: 4 },
  joinBtn: { marginTop: Spacing.sm, height: 34, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  joinBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
});
