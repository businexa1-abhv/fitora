import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { getOwnerBookings, getOwnerDashboard } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function BillingHistoryScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [status, setStatus] = useState('all');

  const dashboardQuery = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => getOwnerDashboard(token!),
    enabled: !!token,
  });

  const bookingsQuery = useQuery({
    queryKey: ['owner', 'bookings'],
    queryFn: () => getOwnerBookings(token!),
    enabled: !!token,
  });

  const rows = useMemo(() => {
    let items = bookingsQuery.data?.items ?? [];
    if (status !== 'all') {
      items = items.filter((b) => b.status.toLowerCase() === status);
    }
    return items;
  }, [bookingsQuery.data, status]);

  const revenue = dashboardQuery.data?.stats.revenueMtd ?? 0;
  const pending = rows.filter((b) => b.status === 'PENDING' || b.status === 'LOCKED').length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="Billing History" />
      <Card style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>
          TOTAL REVENUE (MTD)
        </Text>
        <Text style={{ color: '#fff', fontSize: FontSize.hero, fontWeight: '800' }}>
          {formatCurrency(revenue)}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
          {pending} outstanding bookings
        </Text>
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: Spacing.lg }}
      >
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={[
                styles.chip,
                { backgroundColor: status === s ? colors.primary : colors.mutedBg },
              ]}
            >
              <Text style={{ color: status === s ? '#fff' : colors.foreground, fontWeight: '700' }}>
                {s[0].toUpperCase() + s.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <QueryState
        isLoading={bookingsQuery.isLoading}
        isError={bookingsQuery.isError}
        error={bookingsQuery.error as Error}
        onRetry={() => bookingsQuery.refetch()}
        empty={rows.length === 0}
      >
        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          {rows.map((b) => {
            const name = `${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim() || 'Player';
            return (
              <Pressable
                key={b.id}
                onPress={() =>
                  router.push({
                    pathname: '/manage/invoice/[id]',
                    params: {
                      id: b.id,
                      name,
                      court: b.court?.name ?? 'Court',
                      amount: String(b.totalAmount ?? 0),
                      status: b.status,
                      time: b.slot?.startTime ?? '',
                    },
                  })
                }
              >
                <Card style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: colors.surfaceContainer }]}>
                    <Text style={{ color: colors.primary, fontWeight: '800' }}>
                      {name.slice(0, 1)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>{name}</Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {b.court?.name} · #{b.id.slice(0, 8)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                      {formatCurrency(Number(b.totalAmount ?? 0))}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>
                      {b.status}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: Radius.lg, gap: 2, marginTop: Spacing.md, padding: Spacing.lg },
  chip: { borderRadius: Radius.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, padding: Spacing.md },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
