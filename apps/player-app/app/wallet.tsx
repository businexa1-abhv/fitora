import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { getWallet, topupWallet } from '@/lib/wallet';
import { completePayment } from '@/lib/payments';
import type { PaymentOrder } from '@fitora/shared';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function WalletScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => getWallet(token!),
    enabled: !!token,
  });

  const topupMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!token) throw new Error('Sign in required');
      const payment = (await topupWallet(token, amount)) as PaymentOrder;
      await completePayment(token, payment, user?.email ?? '', user?.firstName ?? 'Player');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert('Success', 'Wallet topped up successfully.');
    },
    onError: (err: Error) => Alert.alert('Top-up failed', err.message),
  });

  const balance = walletQuery.data?.balance ?? 0;
  const transactions = walletQuery.data?.transactions ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Wallet" subtitle="Manage your balance" showBack />

      <QueryState
        isLoading={walletQuery.isLoading}
        isError={walletQuery.isError}
        error={walletQuery.error as Error}
        onRetry={() => walletQuery.refetch()}
      >
        <View style={styles.content}>
          <Card style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balance}>{formatCurrency(balance)}</Text>
            <View style={styles.balanceActions}>
              <Button
                label={topupMutation.isPending ? 'Processing…' : 'Add ₹500'}
                variant="outline"
                size="sm"
                disabled={topupMutation.isPending}
                onPress={() => topupMutation.mutate(500)}
              />
              <Button
                label="Add ₹1000"
                variant="ghost"
                size="sm"
                disabled={topupMutation.isPending}
                onPress={() => topupMutation.mutate(1000)}
              />
            </View>
          </Card>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent transactions
          </Text>

          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: Spacing.sm, paddingBottom: insets.bottom + Spacing.xl }}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.muted }]}>No transactions yet</Text>
            }
            renderItem={({ item }) => (
              <View
                style={[styles.txn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.txnIcon, { backgroundColor: colors.mutedBg }]}>
                  <Ionicons
                    name={item.type === 'CREDIT' ? 'arrow-down' : 'arrow-up'}
                    size={18}
                    color={item.type === 'CREDIT' ? colors.primary : colors.danger}
                  />
                </View>
                <View style={styles.txnContent}>
                  <Text style={[styles.txnLabel, { color: colors.foreground }]}>
                    {item.description ?? item.type}
                  </Text>
                  <Text style={[styles.txnDate, { color: colors.muted }]}>
                    {new Date(item.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txnAmount,
                    { color: item.type === 'CREDIT' ? colors.primary : colors.danger },
                  ]}
                >
                  {item.type === 'CREDIT' ? '+' : '-'}
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            )}
          />
        </View>
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  balanceCard: { marginBottom: Spacing.xl, gap: Spacing.sm },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, fontWeight: '600' },
  balance: { color: '#fff', fontSize: 36, fontWeight: '800' },
  balanceActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md },
  txn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnContent: { flex: 1 },
  txnLabel: { fontSize: FontSize.sm, fontWeight: '700' },
  txnDate: { fontSize: FontSize.xs, marginTop: 2 },
  txnAmount: { fontSize: FontSize.md, fontWeight: '800' },
  empty: { textAlign: 'center', paddingVertical: Spacing.xl },
});
