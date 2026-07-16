import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { EmptyState } from '@/components/empty-state';
import { ManageHeader } from '@/components/manage-header';
import { listExpenses } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function ExpenseTrackerScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const query = useQuery({
    queryKey: ['owner', 'expenses'],
    queryFn: () => listExpenses(token!),
    enabled: !!token,
  });

  useFocusEffect(
    useCallback(() => {
      void query.refetch();
    }, [query]),
  );

  const items = query.data ?? [];
  const total = items.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Expense Tracker" />
      <Card style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>
          TOTAL EXPENSES
        </Text>
        <Text style={{ color: '#fff', fontSize: FontSize.hero, fontWeight: '800' }}>
          {formatCurrency(total)}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{items.length} entries</Text>
      </Card>

      <Pressable
        style={[styles.add, { backgroundColor: colors.secondary }]}
        onPress={() => router.push('/manage/expense/new')}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800' }}>Add expense</Text>
      </Pressable>

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
      >
        {items.length === 0 ? (
          <View style={{ marginTop: Spacing.lg }}>
            <EmptyState
              icon="cash-outline"
              title="No expenses recorded"
              message="Track your facility overheads and equipment costs here."
              ctaLabel="Add expense"
              onCta={() => router.push('/manage/expense/new')}
            />
          </View>
        ) : (
          <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
            {items.map((e) => (
              <Pressable
                key={e.id}
                onPress={() =>
                  router.push({ pathname: '/manage/expense/[id]', params: { id: e.id } })
                }
              >
                <Card style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>{e.title}</Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {e.category} · {new Date(e.date).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                  <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                    {formatCurrency(Number(e.amount))}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 4, marginTop: Spacing.md, padding: Spacing.xl, borderRadius: Radius.xl },
  add: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
});
