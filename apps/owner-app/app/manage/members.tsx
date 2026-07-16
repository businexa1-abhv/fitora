import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { listMyMembershipPlans, listPlanSubscribers } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function MembershipManagementScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const plansQuery = useQuery({
    queryKey: ['owner', 'membership-plans'],
    queryFn: () => listMyMembershipPlans(token!),
    enabled: !!token,
  });

  const plans = plansQuery.data ?? [];
  const subscriberQueries = useQueries({
    queries: plans.map((plan) => ({
      queryKey: ['owner', 'plan-subscribers', plan.id],
      queryFn: () => listPlanSubscribers(token!, plan.id),
      enabled: !!token && !!plan.id,
    })),
  });

  const rows = useMemo(() => {
    const out: Array<{
      id: string;
      name: string;
      planName: string;
      status: string;
      price: number;
    }> = [];
    plans.forEach((plan, i) => {
      const subs = subscriberQueries[i]?.data ?? [];
      for (const s of subs) {
        const name =
          `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() ||
          s.user?.email ||
          'Member';
        out.push({
          id: s.id,
          name,
          planName: plan.name,
          status: s.isActive === false ? 'INACTIVE' : 'ACTIVE',
          price: Number(plan.price ?? 0),
        });
      }
    });
    return out;
  }, [plans, subscriberQueries]);

  const loading = plansQuery.isLoading || subscriberQueries.some((q) => q.isLoading);
  const error = plansQuery.error || subscriberQueries.find((q) => q.error)?.error;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Membership Management" />
      <Text style={[styles.title, { color: colors.foreground }]}>Members</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Active subscribers across your membership plans.
      </Text>

      <View style={styles.stats}>
        <Card style={[styles.stat, { flex: 1 }]}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>PLANS</Text>
          <Text style={{ color: colors.foreground, fontSize: FontSize.xl, fontWeight: '800' }}>
            {plans.length}
          </Text>
        </Card>
        <Card style={[styles.stat, { flex: 1 }]}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>MEMBERS</Text>
          <Text style={{ color: colors.foreground, fontSize: FontSize.xl, fontWeight: '800' }}>
            {rows.length}
          </Text>
        </Card>
      </View>

      <QueryState
        isLoading={loading}
        isError={Boolean(error)}
        error={error as Error}
        onRetry={() => {
          plansQuery.refetch();
          subscriberQueries.forEach((q) => q.refetch());
        }}
        empty={rows.length === 0}
      >
        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          {rows.map((m) => (
            <Card key={m.id} style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>
                  {m.name.slice(0, 1)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: '800' }}>{m.name}</Text>
                <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>{m.planName}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                  {formatCurrency(m.price)}
                </Text>
                <Text style={{ color: colors.secondary, fontSize: 10, fontWeight: '700' }}>
                  {m.status}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  stat: { gap: 2, padding: Spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, padding: Spacing.md },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
