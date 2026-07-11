import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DURATION_LABELS, formatCurrency, type PaymentOrder } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { getCourtMembershipPlans } from '@/lib/courts';
import { getMyMemberships, purchaseMembership } from '@/lib/memberships';
import { completePayment } from '@/lib/payments';
import { FontSize, Spacing } from '@/constants/theme';

export default function MembershipScreen() {
  const { courtId } = useLocalSearchParams<{ courtId?: string }>();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const myQuery = useQuery({
    queryKey: ['memberships', 'my'],
    queryFn: () => getMyMemberships(token!),
    enabled: !!token,
  });

  const plansQuery = useQuery({
    queryKey: ['memberships', 'plans', courtId],
    queryFn: () => getCourtMembershipPlans(courtId!),
    enabled: !!courtId,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!token) throw new Error('Sign in required');
      const result = await purchaseMembership(token, planId) as {
        membership: unknown;
        payment: PaymentOrder;
      };
      await completePayment(
        token,
        result.payment,
        user?.email ?? '',
        user ? `${user.firstName} ${user.lastName}` : 'Player',
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      Alert.alert('Success', 'Membership purchased successfully.');
    },
    onError: (err: Error) => Alert.alert('Purchase failed', err.message),
  });

  const plans = plansQuery.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Memberships" subtitle="Save on every booking" showBack />

      <QueryState
        isLoading={myQuery.isLoading || (!!courtId && plansQuery.isLoading)}
        isError={myQuery.isError || plansQuery.isError}
        error={(myQuery.error ?? plansQuery.error) as Error}
        onRetry={() => {
          myQuery.refetch();
          plansQuery.refetch();
        }}
      >
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          ListHeaderComponent={
            <>
              {(myQuery.data?.length ?? 0) > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your memberships</Text>
                  {myQuery.data?.map((m) => (
                    <Card key={m.id} style={styles.myCard}>
                      <Text style={[styles.name, { color: colors.foreground }]}>{m.plan?.name}</Text>
                      <Text style={[styles.venue, { color: colors.muted }]}>{m.plan?.court?.name}</Text>
                    </Card>
                  ))}
                </View>
              )}
              <Text style={[styles.intro, { color: colors.muted }]}>
                {courtId
                  ? 'Choose a plan for this venue.'
                  : 'Open a venue and tap “View membership plans” to subscribe.'}
              </Text>
            </>
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.venue, { color: colors.muted }]}>
                    {item.court?.name} · {item.court?.city}
                  </Text>
                </View>
                <Badge label={DURATION_LABELS[item.duration]} variant="primary" />
              </View>
              {item.description && (
                <Text style={[styles.description, { color: colors.muted }]}>{item.description}</Text>
              )}
              <View style={styles.footer}>
                <View>
                  <Text style={[styles.priceLabel, { color: colors.muted }]}>Price</Text>
                  <Text style={[styles.price, { color: colors.primary }]}>
                    {formatCurrency(Number(item.price))}
                  </Text>
                </View>
                <Button
                  label={purchaseMutation.isPending ? '…' : 'Subscribe'}
                  size="sm"
                  disabled={purchaseMutation.isPending}
                  onPress={() => purchaseMutation.mutate(item.id)}
                />
              </View>
            </Card>
          )}
          ListEmptyComponent={
            !courtId ? null : (
              <Text style={[styles.empty, { color: colors.muted }]}>No plans for this venue</Text>
            )
          }
        />
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  myCard: { marginBottom: Spacing.xs },
  intro: { fontSize: FontSize.md, marginBottom: Spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.sm },
  cardTitle: { flex: 1 },
  name: { fontSize: FontSize.lg, fontWeight: '800' },
  venue: { fontSize: FontSize.sm, marginTop: 2 },
  description: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  priceLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  price: { fontSize: FontSize.xl, fontWeight: '800' },
  empty: { textAlign: 'center', paddingTop: Spacing.xl },
});
