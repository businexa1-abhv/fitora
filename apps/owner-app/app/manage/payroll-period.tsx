import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import {
  getCurrentPayrollPeriod,
  regeneratePayrollPeriod,
  updatePayrollLineStatus,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function PayrollPeriodDetailScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['owner', 'payroll', 'current'],
    queryFn: () => getCurrentPayrollPeriod(token!),
    enabled: !!token,
  });

  const regenerate = useMutation({
    mutationFn: () => regeneratePayrollPeriod(token!, query.data!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['owner', 'payroll'] }),
  });

  const period = query.data;
  const rows = period?.lines ?? [];
  const total = period?.totalCommission ?? rows.reduce((s, r) => s + Number(r.commission), 0);
  const unpaid = rows.filter((r) => r.status !== 'PAID').length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Pay Cycle" />
      <Text style={[styles.title, { color: colors.foreground }]}>Payroll Period Detail</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        {period ? `${period.startDate.slice(0, 10)} – ${period.endDate.slice(0, 10)}` : 'Loading…'}
      </Text>

      <Card style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>
          CYCLE TOTAL
        </Text>
        <Text style={{ color: '#fff', fontSize: FontSize.hero, fontWeight: '800' }}>
          {formatCurrency(total)}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{unpaid} coaches unpaid</Text>
      </Card>

      <Pressable
        style={[styles.regen, { borderColor: colors.border }]}
        onPress={() => {
          if (!period) return;
          Alert.alert('Regenerate?', 'Rebuild lines from attendance for this period.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Regenerate',
              onPress: () => regenerate.mutate(),
            },
          ]);
        }}
      >
        <Text style={{ color: colors.primary, fontWeight: '800' }}>
          {regenerate.isPending ? 'Regenerating…' : 'Regenerate from attendance'}
        </Text>
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
            const paid = r.status === 'PAID';
            return (
              <Card key={r.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '800' }}>{name}</Text>
                  <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                    {r.sessions} sessions · {formatCurrency(Number(r.ratePerSession))}/session
                  </Text>
                  <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 4 }}>
                    {formatCurrency(Number(r.commission))}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>
                    {paid ? 'PAID' : 'PENDING'}
                  </Text>
                  <Switch
                    value={paid}
                    onValueChange={(v) => {
                      if (!token) return;
                      void updatePayrollLineStatus(token, r.id, v ? 'PAID' : 'PENDING').then(() =>
                        queryClient.invalidateQueries({ queryKey: ['owner', 'payroll'] }),
                      );
                    }}
                  />
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
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.sm },
  hero: { gap: 4, marginTop: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.xl },
  regen: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
});
