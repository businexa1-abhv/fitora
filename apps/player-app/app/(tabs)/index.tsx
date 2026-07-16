import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  APP_NAME,
  BookingStatus,
  SPORT_LABELS,
  SportType,
  formatCurrency,
  type Venue,
} from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { SPORT_COLORS, SPORT_EMOJI, POPULAR_SPORTS } from '@/lib/constants';
import { getMyBookings } from '@/lib/courts';
import { getVenues } from '@/lib/venues';
import { getUnreadNotificationCount } from '@/lib/notifications';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<SportType | null>(POPULAR_SPORTS[0] ?? null);

  const venuesQuery = useQuery({
    queryKey: ['venues', 'home', selectedSport, search],
    queryFn: () =>
      getVenues({
        page: 1,
        sportType: selectedSport ?? undefined,
        search: search.trim() || undefined,
      }),
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
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxxl + 12 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.locationWrap}>
          <Ionicons name="location" size={17} color={colors.accent} />
          <Text style={[styles.locationText, { color: colors.foreground }]}>Hyderabad</Text>
        </View>
        <Text style={[styles.appName, { color: colors.primary }]}>{APP_NAME}</Text>
        <Pressable
          onPress={() => router.push('/notifications')}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
          {(unreadQuery.data?.count ?? 0) > 0 && (
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          )}
        </Pressable>
      </View>

      <View style={styles.content}>
        <View
          style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Search courts, sports or location"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
          />
        </View>

        <View style={styles.shortcutGrid}>
          {(
            [
              { label: 'Memberships', icon: 'ribbon' as const, href: '/membership' },
              { label: 'Wallet', icon: 'wallet' as const, href: '/wallet' },
              { label: 'Training', icon: 'fitness' as const, href: '/training' },
              { label: 'Shop', icon: 'bag-handle' as const, href: '/shop' },
              { label: 'Services', icon: 'construct' as const, href: '/services' },
              { label: 'Alerts', icon: 'notifications' as const, href: '/notifications' },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href)}
              style={[
                styles.shortcutItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.shortcutLabel, { color: colors.foreground }]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportsScroll}>
          <View style={styles.categoryRow}>
            {POPULAR_SPORTS.map((sport) => {
              const active = selectedSport === sport;
              return (
                <Pressable
                  key={sport}
                  onPress={() => setSelectedSport(active ? null : sport)}
                  style={styles.categoryItem}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: active ? colors.accent : colors.mutedBg },
                    ]}
                  >
                    <Text style={styles.categoryEmoji}>{SPORT_EMOJI[sport]}</Text>
                  </View>
                  <Text
                    style={[styles.categoryLabel, { color: active ? colors.accent : colors.muted }]}
                  >
                    {SPORT_LABELS[sport]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Pressable
          onPress={() => router.push('/membership')}
          style={({ pressed }) => [styles.offerCard, pressed && styles.pressed]}
        >
          <View style={styles.offerScrim} />
          <View style={styles.offerContent}>
            <View style={styles.offerPill}>
              <Text style={styles.offerPillText}>Limited Offer</Text>
            </View>
            <Text style={styles.offerTitle}>Summer Slam Membership</Text>
            <Text style={styles.offerSub}>
              Explore premium courts and lock your next high-performance slot.
            </Text>
          </View>
          <View style={styles.offerOrb} />
        </Pressable>

        {upcoming && (
          <Pressable
            onPress={() => router.push('/bookings')}
            style={({ pressed }) => [
              styles.upcomingCard,
              { backgroundColor: colors.card },
              pressed && styles.pressed,
            ]}
          >
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
              {upcoming.court?.name}
            </Text>
            <View style={[styles.codeBox, { backgroundColor: colors.mutedBg }]}>
              <Text style={[styles.codeLabel, { color: colors.muted }]}>Amount paid</Text>
              <Text style={[styles.code, { color: colors.primary }]}>
                {formatCurrency(Number(upcoming.totalAmount))}
              </Text>
            </View>
          </Pressable>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nearby Venues</Text>
            <Text style={[styles.sectionSub, { color: colors.muted }]}>
              Based on your current location
            </Text>
          </View>
          <Pressable onPress={() => router.push('/search')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>

        <QueryState
          isLoading={venuesQuery.isLoading}
          isError={venuesQuery.isError}
          error={venuesQuery.error as Error}
          onRetry={() => venuesQuery.refetch()}
        >
          <View style={styles.courtList}>
            {venuesQuery.data?.items.slice(0, 3).map((venue) => (
              <DashboardVenueCard key={venue.id} venue={venue} />
            ))}
          </View>
        </QueryState>
      </View>
    </ScrollView>
  );
}

function DashboardVenueCard({ venue }: { venue: Venue }) {
  const { colors } = useTheme();
  const router = useRouter();
  const sport =
    (venue.sports[0]?.slug?.toUpperCase().replace(/-/g, '_') as SportType | undefined) ??
    SportType.OTHER;
  const sportColor = SPORT_COLORS[sport];
  const from = Number(venue.priceFrom);
  const price = Number.isFinite(from) && from > 0 ? from : 499;

  return (
    <Pressable
      onPress={() => router.push(`/venue/${venue.id}`)}
      style={({ pressed }) => [
        styles.venueCard,
        { backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.venueVisual, { backgroundColor: `${sportColor}22` }]}>
        <Text style={styles.venueEmoji}>{SPORT_EMOJI[sport]}</Text>
        <View style={styles.ratingPill}>
          <Ionicons name="star" size={13} color="#FFDB17" />
          <Text style={styles.ratingText}>4.8</Text>
        </View>
        <View style={styles.premiumPill}>
          <Text style={styles.premiumText}>
            {venue.courtCount === 1 ? '1 court' : `${venue.courtCount} courts`}
          </Text>
        </View>
      </View>
      <View style={styles.venueBody}>
        <View style={styles.venueTitleRow}>
          <Text style={[styles.venueName, { color: colors.foreground }]} numberOfLines={1}>
            {venue.name}
          </Text>
          <Text style={[styles.venueDistance, { color: colors.muted }]}>2.4 km</Text>
        </View>
        <View style={styles.venueMetaRow}>
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text style={[styles.venueMeta, { color: colors.muted }]} numberOfLines={1}>
            {venue.city} · {venue.address}
          </Text>
        </View>
        <View style={styles.venueFooter}>
          <View>
            <Text style={[styles.fromLabel, { color: colors.muted }]}>Starting from</Text>
            <Text style={[styles.fromPrice, { color: colors.foreground }]}>
              {formatCurrency(price)}
              <Text style={[styles.perHour, { color: colors.muted }]}>/hr</Text>
            </Text>
          </View>
          <View style={[styles.bookNow, { backgroundColor: colors.accent }]}>
            <Text style={styles.bookNowText}>View Courts</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  locationWrap: { alignItems: 'center', flexDirection: 'row', gap: 5, minWidth: 84 },
  locationText: { fontSize: FontSize.sm, fontWeight: '800' },
  appName: { fontSize: FontSize.hero, fontWeight: '900' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
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
  content: { paddingHorizontal: Spacing.xl },
  searchBox: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    height: 56,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, fontWeight: '600' },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  shortcutItem: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    width: '31.5%',
  },
  shortcutIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  shortcutLabel: { fontSize: 11, fontWeight: '800' },
  sportsScroll: {
    marginBottom: Spacing.xl,
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  categoryRow: { flexDirection: 'row', gap: Spacing.lg, paddingRight: Spacing.xl },
  categoryItem: { alignItems: 'center', gap: Spacing.sm, width: 76 },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 64,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    width: 64,
  },
  categoryEmoji: { fontSize: 25 },
  categoryLabel: { fontSize: FontSize.xs, fontWeight: '800', textAlign: 'center' },
  offerCard: {
    backgroundColor: '#171A26',
    borderRadius: 28,
    height: 224,
    marginBottom: Spacing.xxl,
    overflow: 'hidden',
    padding: Spacing.xxl,
  },
  offerScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,107,0,0.18)' },
  offerContent: { flex: 1, justifyContent: 'flex-end', maxWidth: 280 },
  offerPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF3278',
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  offerPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  offerTitle: { color: '#fff', fontSize: 33, fontWeight: '900', lineHeight: 38 },
  offerSub: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  offerOrb: {
    backgroundColor: 'rgba(255,219,23,0.9)',
    borderRadius: Radius.full,
    height: 86,
    position: 'absolute',
    right: -24,
    top: 26,
    width: 86,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  upcomingCard: { borderRadius: Radius.xl, marginBottom: Spacing.xxl, padding: Spacing.lg },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bookingTime: { fontSize: FontSize.sm },
  bookingTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  codeBox: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  codeLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  code: { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: 4, marginTop: 4 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md },
  sectionSub: { fontSize: FontSize.xs, fontWeight: '600', marginTop: -Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAll: { fontSize: FontSize.sm, fontWeight: '700' },
  courtList: { gap: Spacing.md },
  venueCard: { borderRadius: 24, overflow: 'hidden' },
  venueVisual: { height: 164, justifyContent: 'center', padding: Spacing.lg },
  venueEmoji: { fontSize: 60 },
  ratingPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
  },
  ratingText: { color: '#191c1d', fontSize: FontSize.xs, fontWeight: '900' },
  premiumPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff6b00',
    borderRadius: Radius.sm,
    bottom: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    position: 'absolute',
  },
  premiumText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  venueBody: { padding: Spacing.lg },
  venueTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  venueName: { flex: 1, fontSize: FontSize.xl, fontWeight: '900' },
  venueDistance: { fontSize: FontSize.xs, fontWeight: '800', marginTop: 5 },
  venueMetaRow: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: Spacing.sm },
  venueMeta: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  venueFooter: {
    alignItems: 'center',
    borderTopColor: 'rgba(142,113,100,0.16)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  fromLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  fromPrice: { fontSize: FontSize.lg, fontWeight: '900', marginTop: 2 },
  perHour: { fontSize: FontSize.sm, fontWeight: '600' },
  bookNow: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  bookNowText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '900' },
});
