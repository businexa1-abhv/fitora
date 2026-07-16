import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { getCurrentPayrollPeriod } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function PayrollCommissionScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const query = useQuery({
    queryKey: ['owner', 'payroll', 'current'],
    queryFn: () => getCurrentPayrollPeriod(token!),
    enabled: !!token,
  });

  const period = query.data;
  const rows = period?.lines ?? [];
  const total = period?.totalCommission ?? rows.reduce((s, r) => s + Number(r.commission), 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Payroll & Commission" />
      <Pressable onPress={() => router.push('/manage/payroll-period')}>
        <Card style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>
            EST. PAYOUT THIS CYCLE
          </Text>
          <Text style={{ color: '#fff', fontSize: FontSize.hero, fontWeight: '800' }}>
            {formatCurrency(total)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
            Tap to open period detail · sessions from attendance
          </Text>
        </Card>
      </Pressable>

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
        empty={rows.length === 0}
      >
        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          {rows.map((r) => {
            const name =
              `${r.trainer?.firstName ?? ''} ${r.trainer?.lastName ?? ''}`.trim() ||
              r.trainer?.email ||
              'Coach';
            return (
              <Card key={r.id} style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: colors.surfaceContainer }]}>
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>
                    {name.slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '800' }}>{name}</Text>
                  <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                    {r.sessions} sessions · {formatCurrency(Number(r.ratePerSession))}/session
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                    {formatCurrency(Number(r.commission))}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>
                    {r.status}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 4, marginTop: Spacing.md, padding: Spacing.xl, borderRadius: Radius.xl },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
