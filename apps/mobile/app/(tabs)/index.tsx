import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAME, BookingStatus, SPORT_LABELS, formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { CourtCard } from '@/components/court-card';
import { HeroBanner, QuickAction } from '@/components/quick-action';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { SPORT_EMOJI } from '@/lib/constants';
import { POPULAR_SPORTS } from '@/lib/constants';
import { getCourts, getMyBookings } from '@/lib/courts';
import { getUnreadNotificationCount } from '@/lib/notifications';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { SportType } from '@fitora/shared';

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.muted }]}>
            Welcome back{user ? `, ${user.firstName}` : ''} 👋
          </Text>
          <Text style={[styles.appName, { color: colors.foreground }]}>{APP_NAME}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/notifications')}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
            {(unreadQuery.data?.count ?? 0) > 0 && (
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            )}
          </Pressable>
          <Pressable
            onPress={() => router.push('/wallet')}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="wallet-outline" size={22} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <HeroBanner
          title="Book your next game"
          subtitle="Courts, coaching, gear & services — all in one place."
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
          <View style={styles.quickRow}>
            <QuickAction icon="calendar" label="Book" href="/search" />
            <QuickAction icon="ribbon" label="Membership" href="/membership" />
            <QuickAction icon="school" label="Training" href="/training" />
            <QuickAction icon="bag-handle" label="Store" href="/store" />
            <QuickAction icon="construct" label="Services" href="/services" />
          </View>
        </ScrollView>

        {upcoming && (
          <Pressable onPress={() => router.push('/bookings')}>
            <Card style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Badge label="Upcoming" variant="success" />
                <Text style={[styles.bookingTime, { color: colors.muted }]}>
                  {upcoming.slot
                    ? new Date(upcoming.slot.startTime).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : ''}
                </Text>
              </View>
              <Text style={[styles.bookingTitle, { color: colors.foreground }]}>
                {upcoming.court?.sportType
                  ? SPORT_EMOJI[upcoming.court.sportType as SportType]
                  : '🏟️'}{' '}
                {upcoming.court?.name}
              </Text>
              <View style={[styles.codeBox, { backgroundColor: colors.mutedBg }]}>
                <Text style={[styles.codeLabel, { color: colors.muted }]}>Amount</Text>
                <Text style={[styles.code, { color: colors.primary }]}>
                  {formatCurrency(Number(upcoming.totalAmount))}
                </Text>
              </View>
            </Card>
          </Pressable>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Popular sports</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportsScroll}>
          <View style={styles.sportsRow}>
            {POPULAR_SPORTS.map((sport) => (
              <Pressable
                key={sport}
                onPress={() => router.push('/search')}
                style={[styles.sportChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={styles.sportEmoji}>{SPORT_EMOJI[sport]}</Text>
                <Text style={[styles.sportLabel, { color: colors.foreground }]}>
                  {SPORT_LABELS[sport]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nearby venues</Text>
          <Pressable onPress={() => router.push('/search')}>
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
            {courtsQuery.data?.items.slice(0, 3).map((court) => (
              <CourtCard key={court.id} court={court} />
            ))}
          </View>
        </QueryState>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: { fontSize: FontSize.sm, fontWeight: '500' },
  appName: { fontSize: FontSize.hero, fontWeight: '800', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: { paddingHorizontal: Spacing.lg },
  quickActions: { marginBottom: Spacing.lg },
  quickRow: { flexDirection: 'row', gap: Spacing.lg, paddingRight: Spacing.lg },
  bookingCard: { marginBottom: Spacing.lg },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  bookingTime: { fontSize: FontSize.sm },
  bookingTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  codeBox: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  codeLabel: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  code: { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: 4, marginTop: 4 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  seeAll: { fontSize: FontSize.sm, fontWeight: '700' },
  sportsScroll: { marginBottom: Spacing.xl },
  sportsRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.lg },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sportEmoji: { fontSize: 18 },
  sportLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  courtList: { gap: Spacing.md },
});
