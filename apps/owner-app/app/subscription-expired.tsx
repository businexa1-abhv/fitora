import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import {
  getTenantMe,
  getMySubscription,
  getSubscriptionPlans,
  purchaseSubscription,
  type OwnerSubscription,
  type SubscriptionPlan,
} from '@/lib/owner-api';
import { completeOwnerPayment } from '@/lib/payments';

function formatExpiry(dateStr: string | null | undefined) {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SubscriptionExpiredScreen() {
  const { colors } = useTheme();
  const { token, user, signOut, refreshSubscription } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', 'my'],
    queryFn: () => getMySubscription(token!),
    enabled: !!token,
  });

  const plansQuery = useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: () => getSubscriptionPlans(token!),
    enabled: !!token,
  });

  const tenantQuery = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => getTenantMe(token!),
    enabled: !!token,
  });

  const subscription = subscriptionQuery.data as OwnerSubscription | null | undefined;
  const plans = plansQuery.data ?? [];

  const purchaseMutation = useMutation({
    mutationFn: async (plan: SubscriptionPlan) => {
      if (!token) throw new Error('Sign in again to continue');
      const tenantId = subscription?.tenantId ?? tenantQuery.data?.id;
      if (!tenantId) throw new Error('Could not resolve your venue');

      const checkout = await purchaseSubscription(token, plan.id, tenantId);
      await completeOwnerPayment(
        token,
        checkout.payment,
        user?.email ?? '',
        user ? `${user.firstName} ${user.lastName}` : 'Venue Owner',
        `FitOra — ${plan.name}`,
      );
      return plan;
    },
    onSuccess: async (plan) => {
      await queryClient.invalidateQueries({ queryKey: ['subscription', 'my'] });
      await refreshSubscription();
      Alert.alert('Subscription activated', `${plan.name} is now active.`);
      router.replace('/(tabs)');
    },
    onError: (error: Error) => {
      if (error.message !== 'Payment cancelled') {
        Alert.alert('Payment failed', error.message);
      }
    },
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: '#fff3f3' }]}>
          <Ionicons name="warning-outline" size={32} color="#ba1a1a" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Subscription Expired</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {subscription?.endDate
            ? `Your plan expired on ${formatExpiry(subscription.endDate)}.`
            : 'Your FitOra subscription is no longer active.'}
        </Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Renew to resume accepting bookings, managing memberships, and showcasing your venue to
          players.
        </Text>
      </View>

      {/* What's disabled */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Currently disabled</Text>
        {[
          { icon: 'calendar-outline' as const, label: 'New booking creation' },
          { icon: 'card-outline' as const, label: 'Membership sales' },
          { icon: 'people-outline' as const, label: 'Training program enrollment' },
          { icon: 'storefront-outline' as const, label: 'Venue visibility in player search' },
        ].map(({ icon, label }) => (
          <View key={label} style={styles.disabledRow}>
            <Ionicons name={icon} size={18} color="#ba1a1a" />
            <Text style={[styles.disabledLabel, { color: colors.foreground }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Plans */}
      {plansQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={colors.primary} />
      ) : plans.length > 0 ? (
        <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available plans</Text>
          {plans.map((plan: SubscriptionPlan) => (
            <Pressable
              key={plan.id}
              disabled={purchaseMutation.isPending}
              onPress={() => purchaseMutation.mutate(plan)}
              style={[
                styles.planCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                <Text style={[styles.planDuration, { color: colors.muted }]}>
                  {plan.durationDays} days validity
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.planPrice, { color: colors.primary }]}>
                  {formatCurrency(plan.total)}
                </Text>
                <Text style={[styles.planGst, { color: colors.muted }]}>
                  incl. {Math.round((plan.gstRate ?? 0.18) * 100)}% GST
                </Text>
                <Text style={[styles.buyLabel, { color: colors.primary }]}>
                  {purchaseMutation.isPending && purchaseMutation.variables?.id === plan.id
                    ? 'Opening checkout…'
                    : 'Select & pay'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Invoice history hint */}
      <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="receipt-outline" size={16} color={colors.muted} />
        <Text style={[styles.infoText, { color: colors.muted }]}>
          View past invoices in <Text style={{ fontWeight: '700' }}>More → Billing History</Text>
        </Text>
      </View>

      {/* Support */}
      <View style={[styles.supportRow, { borderTopColor: colors.border }]}>
        <Ionicons name="help-circle-outline" size={16} color={colors.muted} />
        <Text style={[styles.supportText, { color: colors.muted }]}>
          Need help?{' '}
          <Text
            style={{ color: colors.primary, fontWeight: '700' }}
            onPress={() => Linking.openURL('mailto:support@fitora.com')}
          >
            support@fitora.com
          </Text>
        </Text>
      </View>

      <Pressable onPress={signOut} style={styles.signOutBtn}>
        <Text style={[styles.signOutText, { color: colors.muted }]}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  body: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, opacity: 0.8 },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  disabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  disabledLabel: { fontSize: FontSize.sm },
  planCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
  },
  planName: { fontSize: FontSize.md, fontWeight: '700' },
  planDuration: { fontSize: FontSize.sm, marginTop: 2 },
  planPrice: { fontSize: FontSize.xl, fontWeight: '800' },
  planGst: { fontSize: FontSize.xs, marginTop: 2 },
  buyLabel: { fontSize: FontSize.xs, fontWeight: '800', marginTop: Spacing.sm },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
  },
  renewText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  infoText: { fontSize: FontSize.sm, flex: 1 },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  supportText: { fontSize: FontSize.sm, flex: 1 },
  signOutBtn: { alignItems: 'center', marginTop: Spacing.lg, paddingVertical: Spacing.md },
  signOutText: { fontSize: FontSize.sm },
});
