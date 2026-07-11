import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { getUserInitials } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMyBookings } from '@/lib/courts';
import { getMyMemberships } from '@/lib/memberships';
import { getWallet } from '@/lib/wallet';
import { getUnreadNotificationCount } from '@/lib/notifications';
import { FontSize, Radius, Spacing } from '@/constants/theme';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  href: '/membership' | '/services' | '/wallet' | '/notifications' | '/notification-settings' | '/training' | '/store' | '/bookings';
}

const MENU: MenuItem[] = [
  { icon: 'calendar', label: 'My bookings', subtitle: 'View upcoming & past', href: '/bookings' },
  { icon: 'ribbon', label: 'Memberships', subtitle: 'Plans & subscriptions', href: '/membership' },
  { icon: 'school', label: 'Kids training', subtitle: 'Programs & enrollments', href: '/training' },
  { icon: 'bag-handle', label: 'Orders', subtitle: 'Store purchases', href: '/store' },
  { icon: 'construct', label: 'Services', subtitle: 'Stringing, repair & print', href: '/services' },
  { icon: 'wallet', label: 'Wallet', subtitle: 'Balance & transactions', href: '/wallet' },
  { icon: 'notifications', label: 'Notifications', subtitle: 'Alerts & updates', href: '/notifications' },
  { icon: 'options', label: 'Notification settings', subtitle: 'Email, SMS & push', href: '/notification-settings' },
];

export default function ProfileScreen() {
  const { colors, isDark, toggleDark, mode, setMode } = useTheme();
  const { user, token, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'count'],
    queryFn: () => getMyBookings(token!, 1),
    enabled: !!token,
  });

  const membershipsQuery = useQuery({
    queryKey: ['memberships', 'my'],
    queryFn: () => getMyMemberships(token!, true),
    enabled: !!token,
  });

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => getWallet(token!),
    enabled: !!token,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => getUnreadNotificationCount(token!),
    enabled: !!token,
  });

  const menu = MENU.map((item) =>
    item.href === '/notifications' && unreadQuery.data
      ? { ...item, badge: String(unreadQuery.data.count) }
      : item,
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {getUserInitials(user)}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user ? `${user.firstName} ${user.lastName}` : 'Player'}
          </Text>
          <Text style={[styles.email, { color: colors.muted }]}>{user?.email ?? '—'}</Text>
        </View>
        <Pressable
          onPress={toggleDark}
          style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Card style={styles.statsCard}>
          <StatItem label="Bookings" value={String(bookingsQuery.data?.total ?? 0)} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatItem
            label="Memberships"
            value={String(membershipsQuery.data?.length ?? 0)}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatItem
            label="Wallet"
            value={formatCurrency(walletQuery.data?.balance ?? 0)}
            colors={colors}
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account</Text>
        <Card padded={false}>
          {menu.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [
                styles.menuItem,
                i < menu.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.mutedBg },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.menuSub, { color: colors.muted }]}>{item.subtitle}</Text>
              </View>
              {'badge' in item && item.badge && Number(item.badge) > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </Card>

        <View style={styles.appearance}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
          <Card>
            <Text style={[styles.appearanceLabel, { color: colors.muted }]}>
              Theme: {mode === 'system' ? 'System' : isDark ? 'Dark' : 'Light'}
            </Text>
            <View style={styles.themeRow}>
              <Button label="Light" variant={!isDark ? 'primary' : 'outline'} size="sm" onPress={() => setMode('light')} />
              <Button label="Dark" variant={isDark ? 'primary' : 'outline'} size="sm" onPress={() => setMode('dark')} />
              <Button label="System" variant={mode === 'system' ? 'primary' : 'outline'} size="sm" onPress={() => setMode('system')} />
            </View>
          </Card>
        </View>

        <Button label="Sign out" variant="outline" fullWidth style={{ marginTop: Spacing.lg }} onPress={signOut} />
      </View>
    </ScrollView>
  );
}

function StatItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { foreground: string; muted: string };
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: '800' },
  profileInfo: { flex: 1 },
  name: { fontSize: FontSize.xl, fontWeight: '800' },
  email: { fontSize: FontSize.sm, marginTop: 2 },
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: Spacing.lg },
  statsCard: { flexDirection: 'row', marginBottom: Spacing.xl },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2, fontWeight: '600' },
  divider: { width: 1, height: '100%' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: FontSize.md, fontWeight: '700' },
  menuSub: { fontSize: FontSize.sm, marginTop: 1 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: Spacing.xs,
  },
  badgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
  appearance: { marginTop: Spacing.xl },
  appearanceLabel: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
});
