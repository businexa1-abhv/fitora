import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme-provider';
import { EmptyState } from '@/components/empty-state';
import { ManageHeader } from '@/components/manage-header';
import { FontSize, Spacing } from '@/constants/theme';

const PACK = [
  {
    icon: 'people-outline' as const,
    title: 'Player Directory',
    message: 'No players found in your roster yet. Start building your sports community today.',
    ctaLabel: 'View bookings',
    href: '/manage/players',
  },
  {
    icon: 'fitness-outline' as const,
    title: 'Coach Directory',
    message: 'No coaches yet. Onboard your professional training staff to begin sessions.',
    ctaLabel: 'Open coaches',
    href: '/manage/coaches',
  },
  {
    icon: 'receipt-outline' as const,
    title: 'Billing History',
    message: 'No transactions recorded. Payment history will appear here once billing begins.',
    ctaLabel: 'Open billing',
    href: '/manage/billing',
  },
  {
    icon: 'cash-outline' as const,
    title: 'Expenses',
    message: 'No expenses recorded. Track your facility overheads and equipment costs here.',
    ctaLabel: 'Add expense',
    href: '/manage/expense/new',
  },
  {
    icon: 'pricetags-outline' as const,
    title: 'Promotions',
    message: 'No active coupons. Create seasonal discounts or referral codes for players.',
    ctaLabel: 'Create promo',
    href: '/manage/promo-form',
  },
  {
    icon: 'calendar-outline' as const,
    title: 'Staff Roster',
    message: 'No shifts assigned. Use the scheduler to manage your facility staff hours.',
    ctaLabel: 'Add shift',
    href: '/manage/staff-edit',
  },
];

export default function EmptyStatesPackScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
      }}
    >
      <ManageHeader title="Empty States" />
      <Text style={[styles.title, { color: colors.foreground }]}>Empty States Pack</Text>
      <Text style={{ color: colors.muted }}>
        Reference empty UI used across directory and finance modules.
      </Text>
      {PACK.map((item) => (
        <EmptyState
          key={item.title}
          icon={item.icon}
          title={item.title}
          message={item.message}
          ctaLabel={item.ctaLabel}
          onCta={() => router.push(item.href as never)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
});
