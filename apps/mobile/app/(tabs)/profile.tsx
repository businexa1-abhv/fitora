import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getUserInitials } from '@/lib/auth';
import { getMyBookings } from '@/lib/courts';
import { getUnreadNotificationCount } from '@/lib/notifications';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type PlayerLink = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  href: '/bookings' | '/search';
};

const PLAYER_LINKS: PlayerLink[] = [
  {
    icon: 'calendar',
    label: 'My bookings',
    subtitle: 'Reservations, QR passes and history',
    href: '/bookings',
  },
  {
    icon: 'search',
    label: 'Find courts',
    subtitle: 'Search sports, cities and premium venues',
    href: '/search',
  },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, token, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'count'],
    queryFn: () => getMyBookings(token!, 1),
    enabled: !!token,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => getUnreadNotificationCount(token!),
    enabled: !!token,
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + Spacing.lg, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.locationWrap}>
          <Ionicons name="location" size={17} color={colors.accent} />
          <Text style={[styles.locationText, { color: colors.foreground }]}>Hyderabad</Text>
        </View>
        <Text style={[styles.brand, { color: colors.primary }]}>FitOra</Text>
        <Pressable style={[styles.headerIcon, { backgroundColor: colors.card }]}>
          <Ionicons name="notifications-outline" size={21} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.playerCard}>
          <View style={styles.playerGlow} />
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Text style={styles.avatarText}>{getUserInitials(user)}</Text>
          </View>
          <View style={styles.playerCopy}>
            <Text style={styles.playerKicker}>Player Profile</Text>
            <Text style={styles.playerName}>
              {user ? `${user.firstName} ${user.lastName}` : 'Player'}
            </Text>
            <Text style={styles.playerEmail}>{user?.email ?? 'Complete your FitOra profile'}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Bookings" value={String(bookingsQuery.data?.total ?? 0)} />
          <StatCard label="Unread" value={String(unreadQuery.data?.count ?? 0)} />
          <StatCard label="City" value="Hyderabad" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Player Hub</Text>
          {unreadQuery.data && unreadQuery.data.count > 0 ? (
            <View style={[styles.countPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>
                {unreadQuery.data.count} alerts
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.menuStack}>
          {PLAYER_LINKS.map((item) => (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [
                styles.menuCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.menuCopy}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.menuSub, { color: colors.muted }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <Button
          label="Sign out"
          variant="outline"
          fullWidth
          style={styles.signOut}
          onPress={signOut}
        />
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
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
  content: { gap: Spacing.xl, paddingHorizontal: Spacing.xl },
  playerCard: {
    backgroundColor: '#171A26',
    borderRadius: 28,
    minHeight: 190,
    overflow: 'hidden',
    padding: Spacing.xxl,
  },
  playerGlow: {
    backgroundColor: 'rgba(255,107,0,0.86)',
    borderRadius: Radius.full,
    height: 116,
    position: 'absolute',
    right: -28,
    top: -22,
    width: 116,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 64,
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    width: 64,
  },
  avatarText: { color: '#fff', fontSize: FontSize.xl, fontWeight: '900' },
  playerCopy: { gap: 3, maxWidth: 260 },
  playerKicker: {
    color: '#FFDB17',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  playerName: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 36 },
  playerEmail: { color: 'rgba(255,255,255,0.76)', fontSize: FontSize.sm, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    flex: 1,
    minHeight: 86,
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  statValue: { fontSize: FontSize.lg, fontWeight: '900' },
  statLabel: { fontSize: FontSize.xs, fontWeight: '800', marginTop: 3 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '900' },
  countPill: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  countText: { fontSize: FontSize.xs, fontWeight: '900' },
  menuStack: { gap: Spacing.md },
  menuCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  menuIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  menuCopy: { flex: 1 },
  menuLabel: { fontSize: FontSize.md, fontWeight: '900' },
  menuSub: { fontSize: FontSize.xs, fontWeight: '700', lineHeight: 18, marginTop: 2 },
  signOut: { marginTop: Spacing.sm },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});
