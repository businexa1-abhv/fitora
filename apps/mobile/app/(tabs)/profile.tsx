import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { getUserInitials } from '@/lib/auth';
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
  danger?: boolean;
}

const MENU_GROUPS: MenuItem[][] = [
  [
    { icon: 'calendar-outline', label: 'My Bookings', subtitle: 'View upcoming & past', href: '/bookings' },
    { icon: 'card-outline', label: 'My Memberships', subtitle: 'Plans & subscriptions', href: '/membership' },
    { icon: 'school-outline', label: 'Kids Profiles', subtitle: 'Programs & enrollments', href: '/training' },
    { icon: 'cube-outline', label: 'My Orders', subtitle: 'Store purchases', href: '/store' },
    { icon: 'wallet-outline', label: 'Wallet & Payments', subtitle: 'Balance & transactions', href: '/wallet' },
  ],
  [
    { icon: 'notifications-outline', label: 'Notification Settings', subtitle: 'Email, SMS & push', href: '/notification-settings' },
    { icon: 'help-circle-outline', label: 'Help & Support', subtitle: 'FAQs & contact us', href: '/notifications' },
  ],
];

export default function ProfileScreen() {
  const { colors, isDark, toggleDark } = useTheme();
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { paddingTop: insets.top + Spacing.lg, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {getUserInitials(user)}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user ? `${user.firstName} ${user.lastName ?? ''}` : 'Player'}
          </Text>
          <View style={styles.roleRow}>
            <View style={[styles.roleBadge, { borderColor: colors.primary }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>Player</Text>
            </View>
            <Text style={[styles.location, { color: colors.muted }]}>📍 Hyderabad</Text>
          </View>
        </View>
        <Pressable onPress={toggleDark} style={[styles.iconBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Sports Passport card */}
      <View style={styles.content}>
        <View style={[styles.passportCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Text style={[styles.passportTitle, { color: colors.primary }]}>🏆 Sports Passport</Text>
          <View style={styles.passportStats}>
            <View style={styles.passportStat}>
              <Text style={[styles.passportStatVal, { color: colors.foreground }]}>
                {bookingsQuery.data?.total ?? 0}
              </Text>
              <Text style={[styles.passportStatLabel, { color: colors.muted }]}>Courts Booked</Text>
            </View>
            <View style={[styles.passportDivider, { backgroundColor: colors.primary }]} />
            <View style={styles.passportStat}>
              <Text style={[styles.passportStatVal, { color: colors.foreground }]}>
                {membershipsQuery.data?.length ?? 0}
              </Text>
              <Text style={[styles.passportStatLabel, { color: colors.muted }]}>Memberships</Text>
            </View>
            <View style={[styles.passportDivider, { backgroundColor: colors.primary }]} />
            <View style={styles.passportStat}>
              <Text style={[styles.passportStatVal, { color: colors.foreground }]}>
                {formatCurrency(walletQuery.data?.balance ?? 0)}
              </Text>
              <Text style={[styles.passportStatLabel, { color: colors.muted }]}>Wallet</Text>
            </View>
          </View>
        </View>

        {/* Menu groups */}
        {MENU_GROUPS.map((group, gi) => (
          <View key={gi} style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {group.map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [
                  styles.menuItem,
                  i < group.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  pressed && { backgroundColor: colors.mutedBg },
                ]}
              >
                <View style={[styles.menuIconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.menuSub, { color: colors.muted }]}>{item.subtitle}</Text>
                </View>
                {item.href === '/notifications' && (unreadQuery.data?.count ?? 0) > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.badgeText}>{unreadQuery.data!.count}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ))}

        {/* Refer a Friend banner */}
        <View style={[styles.referBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Text style={[styles.referTitle, { color: '#92400E' }]}>🎁 Refer a Friend</Text>
          <Text style={[styles.referSub, { color: '#78350F' }]}>Earn ₹100 per referral</Text>
          <Pressable style={[styles.referBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.referBtnText}>Refer Now</Text>
          </Pressable>
        </View>

        <Button label="Sign out" variant="outline" fullWidth style={{ marginTop: Spacing.md }} onPress={signOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.xl, fontWeight: '800' },
  profileInfo: { flex: 1 },
  name: { fontSize: FontSize.xl, fontWeight: '800' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  roleText: { fontSize: FontSize.xs, fontWeight: '700' },
  location: { fontSize: FontSize.xs },
  iconBtn: { width: 36, height: 36, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.lg },

  // Passport card
  passportCard: { borderRadius: Radius.lg, borderWidth: 1.5, padding: Spacing.lg, marginBottom: Spacing.lg },
  passportTitle: { fontSize: FontSize.md, fontWeight: '800', marginBottom: Spacing.md },
  passportStats: { flexDirection: 'row', alignItems: 'center' },
  passportStat: { flex: 1, alignItems: 'center' },
  passportStatVal: { fontSize: FontSize.xl, fontWeight: '800' },
  passportStatLabel: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  passportDivider: { width: 1, height: 40, opacity: 0.3 },

  // Menu
  menuGroup: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  menuIconBox: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: FontSize.md, fontWeight: '600' },
  menuSub: { fontSize: FontSize.xs, marginTop: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },

  // Refer
  referBanner: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  referTitle: { fontSize: FontSize.md, fontWeight: '800', flex: 1 },
  referSub: { fontSize: FontSize.xs },
  referBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.md },
  referBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
});
