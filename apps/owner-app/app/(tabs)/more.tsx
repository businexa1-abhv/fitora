import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type Link = {
  title: string;
  subtitle: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const OPS_LINKS: Link[] = [
  {
    title: 'Community Hub',
    subtitle: 'Venue groups, announcements, tournaments',
    href: '/manage/community',
    icon: 'people-circle-outline',
  },
  {
    title: 'Games & Services',
    subtitle: 'Sports overview and enrollments',
    href: '/ops/games',
    icon: 'tennisball-outline',
  },
  {
    title: 'Membership Plans',
    subtitle: 'Tiers, pricing, and benefits',
    href: '/ops/memberships',
    icon: 'card-outline',
  },
  {
    title: 'Court Setup & Pricing',
    subtitle: 'Hourly rates and peak rules',
    href: '/ops/pricing',
    icon: 'pricetag-outline',
  },
  {
    title: 'Operating Hours',
    subtitle: 'Weekly schedules and slot generation',
    href: '/ops/hours',
    icon: 'time-outline',
  },
  {
    title: 'Slot Types',
    subtitle: 'Practice, coaching, tournament categories',
    href: '/ops/slot-types',
    icon: 'grid-outline',
  },
  {
    title: 'Master Calendar',
    subtitle: 'Day view of bookings and open slots',
    href: '/ops/calendar',
    icon: 'calendar-outline',
  },
  {
    title: 'Walk-in Booking',
    subtitle: 'Guest capture and quick entry',
    href: '/ops/walk-in-guest',
    icon: 'walk-outline',
  },
  {
    title: 'Check-in / QR',
    subtitle: 'Scanner and manual venue check-in',
    href: '/ops/check-in-scanner',
    icon: 'qr-code-outline',
  },
];

const PEOPLE_LINKS: Link[] = [
  {
    title: 'Player Directory',
    subtitle: 'Athletes from bookings',
    href: '/manage/players',
    icon: 'people-outline',
  },
  {
    title: 'Coach Directory',
    subtitle: 'Trainers on your tenant',
    href: '/manage/coaches',
    icon: 'fitness-outline',
  },
  {
    title: 'Staff Shift Roster',
    subtitle: 'Day roster, week view, editor',
    href: '/manage/staff-week',
    icon: 'briefcase-outline',
  },
  {
    title: 'Membership Members',
    subtitle: 'Plan subscribers',
    href: '/manage/members',
    icon: 'ribbon-outline',
  },
];

const FINANCE_LINKS: Link[] = [
  {
    title: 'Billing History',
    subtitle: 'Booking invoices and revenue',
    href: '/manage/billing',
    icon: 'receipt-outline',
  },
  {
    title: 'Invoices',
    subtitle: 'Detailed booking invoices with GST breakdown',
    href: '/manage/invoices',
    icon: 'document-text-outline',
  },
  {
    title: 'Reports & Exports',
    subtitle: 'Download CSV reports for bookings, revenue, and more',
    href: '/manage/reports',
    icon: 'bar-chart-outline',
  },
  {
    title: 'Financial Settings',
    subtitle: 'Razorpay and payouts',
    href: '/manage/financial',
    icon: 'wallet-outline',
  },
  {
    title: 'Expense Tracker',
    subtitle: 'Add and edit venue expenses',
    href: '/manage/expenses',
    icon: 'cash-outline',
  },
  {
    title: 'Payroll & Commission',
    subtitle: 'Pay cycle detail',
    href: '/manage/payroll-period',
    icon: 'stats-chart-outline',
  },
  {
    title: 'Discounts & Promotions',
    subtitle: 'Coupon codes',
    href: '/manage/promotions',
    icon: 'pricetags-outline',
  },
];

const ACCOUNT_LINKS: Link[] = [
  {
    title: 'Owner Profile',
    subtitle: 'Your account details',
    href: '/manage/profile',
    icon: 'person-outline',
  },
  {
    title: 'Business Information',
    subtitle: 'Academy name and branding',
    href: '/manage/business',
    icon: 'business-outline',
  },
  {
    title: 'Security & Access',
    subtitle: 'Password and sessions',
    href: '/manage/security',
    icon: 'shield-checkmark-outline',
  },
  {
    title: 'App Preferences',
    subtitle: 'Notifications and display',
    href: '/manage/preferences',
    icon: 'options-outline',
  },
  {
    title: 'Empty States Pack',
    subtitle: 'Reference empty UI',
    href: '/manage/empty-states',
    icon: 'albums-outline',
  },
];

function LinkSection({
  title,
  links,
  colors,
  onPress,
}: {
  title: string;
  links: Link[];
  colors: {
    foreground: string;
    muted: string;
    card: string;
    border: string;
    primary: string;
    surfaceContainer: string;
  };
  onPress: (href: string) => void;
}) {
  return (
    <>
      <Text style={[styles.section, { color: colors.foreground }]}>{title}</Text>
      <View style={{ gap: Spacing.sm }}>
        {links.map((link) => (
          <Pressable
            key={link.href}
            onPress={() => onPress(link.href)}
            style={[styles.linkRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name={link.icon} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: '800' }}>{link.title}</Text>
              <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>{link.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </>
  );
}

export default function MoreScreen() {
  const { colors } = useTheme();
  const { user, signOut, isOwner, isTrainer } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const go = (href: string) => router.push(href as never);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      <Card style={{ marginTop: Spacing.lg }}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{user?.email}</Text>
        <Text style={{ color: colors.primary, marginTop: Spacing.sm, fontWeight: '700' }}>
          {isOwner ? 'Venue Owner' : isTrainer ? 'Coach' : 'User'}
        </Text>
      </Card>

      <LinkSection title="People" links={PEOPLE_LINKS} colors={colors} onPress={go} />
      <LinkSection title="Finance" links={FINANCE_LINKS} colors={colors} onPress={go} />
      <LinkSection title="Academy Operations" links={OPS_LINKS} colors={colors} onPress={go} />
      <LinkSection title="Account" links={ACCOUNT_LINKS} colors={colors} onPress={go} />

      <Pressable
        onPress={() => void signOut()}
        style={[styles.signOut, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  name: { fontSize: FontSize.xl, fontWeight: '800' },
  section: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  linkRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  signOut: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  signOutText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
});
