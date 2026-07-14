import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingStatus, SPORT_LABELS, formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { CourtCard } from '@/components/court-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { SPORT_EMOJI, POPULAR_SPORTS } from '@/lib/constants';
import { getCourts, getMyBookings } from '@/lib/courts';
import { getUnreadNotificationCount } from '@/lib/notifications';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { SportType } from '@fitora/shared';

const FRIENDS_MOCK = [
  { initials: 'RK', name: 'Rahul', venue: 'Smash Arena', color: '#059669' },
  { initials: 'PS', name: 'Priya', venue: 'Greenfield FC', color: '#2563EB' },
  { initials: 'AV', name: 'Arun', venue: 'KPHB Courts', color: '#D97706' },
  { initials: 'KM', name: 'Kavya', venue: 'ClubX', color: '#7C3AED' },
];

const OPEN_GAMES_MOCK = [
  { sport: '🏸', title: '4v4 Badminton', venue: 'Smash Arena', time: '8:00 PM', spots: 3 },
  { sport: '⚽', title: '5-a-Side Football', venue: 'Greenfield FC', time: '7:00 PM', spots: 2 },
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const courtsQuery = useQuery({
    queryKey: ['courts', 'home'],
    queryFn: () => getCourts({ page: 1 }),
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => getMyBookings(token!, 1, 'CONFIRMED'),
    enabled: !!token,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => getUnreadNotificationCount(token!),
    enabled: !!token,
  });

  const upcoming = bookingsQuery.data?.items.find(
    (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING,
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* MD3 Large Top App Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md, backgroundColor: colors.background }]}>
        <View style={styles.topBarRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, { color: colors.muted }]}>{greeting}</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {user ? `${user.firstName} ${user.lastName ?? ''}` : 'Welcome back'}
            </Text>
          </View>
          <View style={styles.topBarActions}>
            <Pressable
              onPress={() => router.push('/(tabs)/explore')}
              style={[styles.cityChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            >
              <Ionicons name="location" size={13} color={colors.primary} />
              <Text style={[styles.cityChipText, { color: colors.primary }]}>Hyderabad</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/notifications')}
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
              {(unreadQuery.data?.count ?? 0) > 0 && (
                <View style={[styles.notifDot, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/profile')} style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {user ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}` : 'FO'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Upcoming Booking Card */}
        {upcoming && (
          <Pressable onPress={() => router.push('/bookings')} style={styles.sectionGap}>
            <View style={[styles.upcomingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.upcomingAccent, { backgroundColor: colors.primary }]} />
              <View style={styles.upcomingInner}>
                <View style={styles.upcomingTop}>
                  <Badge label="Upcoming" variant="success" />
                  <Text style={[styles.upcomingTime, { color: colors.muted }]}>
                    {upcoming.slot
                      ? new Date(upcoming.slot.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                      : ''}
                  </Text>
                </View>
                <Text style={[styles.upcomingTitle, { color: colors.foreground }]}>
                  {upcoming.court?.sportType ? SPORT_EMOJI[upcoming.court.sportType as SportType] : '🏟️'}{' '}
                  {upcoming.court?.name}
                </Text>
                <Text style={[styles.upcomingMeta, { color: colors.muted }]}>
                  {upcoming.court?.city} · {formatCurrency(Number(upcoming.totalAmount))}
                </Text>
                <View style={styles.upcomingActions}>
                  <Pressable style={[styles.checkInBtn, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.checkInBtnText, { color: colors.primaryForeground }]}>Check In</Text>
                  </Pressable>
                  <Pressable style={[styles.qrBtn, { borderColor: colors.primary }]}>
                    <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            </View>
          </Pressable>
        )}

        {/* Sport Quick Links */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Book a Court</Text>
            <Pressable onPress={() => router.push('/(tabs)/explore')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.sportsRow}>
              {POPULAR_SPORTS.map((sport) => (
                <Pressable
                  key={sport}
                  onPress={() => router.push('/(tabs)/play')}
                  style={[styles.sportTile, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={styles.sportEmoji}>{SPORT_EMOJI[sport]}</Text>
                  <Text style={[styles.sportLabel, { color: colors.foreground }]}>
                    {SPORT_LABELS[sport]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Friends Playing Today */}
        <View style={styles.sectionGap}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Friends Playing Today</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.friendsRow}>
              {FRIENDS_MOCK.map((f) => (
                <View key={f.name} style={styles.friendItem}>
                  <View style={[styles.friendAvatar, { backgroundColor: f.color }]}>
                    <Text style={styles.friendAvatarText}>{f.initials}</Text>
                  </View>
                  <Text style={[styles.friendName, { color: colors.foreground }]}>{f.name}</Text>
                  <Text style={[styles.friendVenue, { color: colors.muted }]} numberOfLines={1}>@{f.venue}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Open Games Nearby */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Open Games Near You</Text>
            <Pressable onPress={() => router.push('/(tabs)/play')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.openGamesRow}>
              {OPEN_GAMES_MOCK.map((g, i) => (
                <View key={i} style={[styles.openGameCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.openGameSport}>{g.sport}</Text>
                  <Text style={[styles.openGameTitle, { color: colors.foreground }]}>{g.title}</Text>
                  <Text style={[styles.openGameMeta, { color: colors.muted }]}>{g.venue}</Text>
                  <Text style={[styles.openGameTime, { color: colors.muted }]}>{g.time}</Text>
                  <View style={[styles.spotsChip, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.spotsText, { color: '#DC2626' }]}>{g.spots} spots left</Text>
                  </View>
                  <Pressable style={[styles.joinBtn, { borderColor: colors.primary }]}>
                    <Text style={[styles.joinBtnText, { color: colors.primary }]}>Join</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Recommended Venues */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recommended Venues</Text>
            <Pressable onPress={() => router.push('/(tabs)/explore')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          <QueryState
            isLoading={courtsQuery.isLoading}
            isError={courtsQuery.isError}
            error={courtsQuery.error as Error}
            onRetry={() => courtsQuery.refetch()}
          >
            <View style={styles.courtList}>
              {courtsQuery.data?.items.slice(0, 4).map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </View>
          </QueryState>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  topBarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  greetingText: { fontSize: FontSize.sm, fontWeight: '500' },
  userName: { fontSize: FontSize.xl, fontWeight: '800', marginTop: 2 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  cityChipText: { fontSize: FontSize.xs, fontWeight: '600' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.sm, fontWeight: '800' },
  content: { paddingHorizontal: Spacing.lg },
  sectionGap: { marginBottom: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  seeAll: { fontSize: FontSize.sm, fontWeight: '700' },

  // Upcoming booking card
  upcomingCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  upcomingAccent: { width: 4 },
  upcomingInner: { flex: 1, padding: Spacing.lg },
  upcomingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  upcomingTime: { fontSize: FontSize.xs, fontWeight: '500' },
  upcomingTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: 4 },
  upcomingMeta: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  upcomingActions: { flexDirection: 'row', gap: Spacing.sm },
  checkInBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  qrBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sport tiles
  sportsRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.lg },
  sportTile: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sportEmoji: { fontSize: 26 },
  sportLabel: { fontSize: FontSize.xs, fontWeight: '600', textAlign: 'center' },

  // Friends
  friendsRow: { flexDirection: 'row', gap: Spacing.lg, paddingRight: Spacing.lg },
  friendItem: { alignItems: 'center', width: 64 },
  friendAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  friendAvatarText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  friendName: { fontSize: FontSize.xs, fontWeight: '700', textAlign: 'center' },
  friendVenue: { fontSize: 10, textAlign: 'center' },

  // Open games
  openGamesRow: { flexDirection: 'row', gap: Spacing.md, paddingRight: Spacing.lg },
  openGameCard: {
    width: 160,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  openGameSport: { fontSize: 28, marginBottom: 4 },
  openGameTitle: { fontSize: FontSize.sm, fontWeight: '700' },
  openGameMeta: { fontSize: FontSize.xs },
  openGameTime: { fontSize: FontSize.xs },
  spotsChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  spotsText: { fontSize: 10, fontWeight: '700' },
  joinBtn: {
    marginTop: Spacing.sm,
    height: 34,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: { fontSize: FontSize.sm, fontWeight: '700' },

  courtList: { gap: Spacing.md },
});
