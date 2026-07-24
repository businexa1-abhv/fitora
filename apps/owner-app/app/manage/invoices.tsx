import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { getOwnerBookingsFiltered } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'COMPLETED', label: 'Paid' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PENDING', label: 'Pending' },
] as const;

export default function InvoicesScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const query = useQuery({
    queryKey: ['owner', 'invoices', activeFilter],
    queryFn: () =>
      getOwnerBookingsFiltered(token!, {
        status: activeFilter !== 'all' ? activeFilter : undefined,
        pageSize: 50,
      }),
    enabled: !!token,
  });

  const rows = query.data?.items ?? [];

  const totalPaid = useMemo(
    () =>
      rows
        .filter((b) => b.status === 'COMPLETED')
        .reduce((s, b) => s + Number(b.totalAmount ?? 0), 0),
    [rows],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + Spacing.lg,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <ManageHeader title="Invoices" />
        <Text style={[styles.title, { color: colors.foreground }]}>Invoice History</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          All booking invoices and payment records.
        </Text>

        {rows.length > 0 ? (
          <Card style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' }}>
              TOTAL PAID
            </Text>
            <Text style={{ color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' }}>
              {formatCurrency(totalPaid)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs }}>
              {rows.filter((b) => b.status === 'COMPLETED').length} paid invoices
            </Text>
          </Card>
        ) : null}

        {/* Filter chips */}
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.mutedBg,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.muted,
                    fontSize: FontSize.xs,
                    fontWeight: '700',
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
        empty={rows.length === 0}
      >
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xxxl,
            gap: Spacing.sm,
            paddingTop: Spacing.md,
          }}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
          }
          renderItem={({ item }) => {
            const playerName = item.user
              ? `${item.user.firstName ?? ''} ${item.user.lastName ?? ''}`.trim() || item.user.email
              : 'Unknown';
            const amount = Number(item.totalAmount ?? 0);
            const isPaid = item.status === 'COMPLETED';
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/manage/invoice/[id]',
                    params: {
                      id: item.id,
                      name: playerName,
                      court: item.court?.name ?? '',
                      amount: String(amount),
                      status: item.status,
                      time: item.slot?.startTime ?? item.createdAt ?? '',
                    },
                  } as never)
                }
              >
                <Card style={styles.row}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: isPaid ? '#d1fae5' : colors.mutedBg },
                    ]}
                  >
                    <Ionicons
                      name={isPaid ? 'checkmark-circle' : 'time-outline'}
                      size={20}
                      color={isPaid ? '#006c49' : colors.muted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }} numberOfLines={1}>
                      {playerName ?? '—'}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.xs }}>
                      {item.court?.name ?? ''} ·{' '}
                      {item.slot?.startTime
                        ? new Date(item.slot.startTime).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                      {formatCurrency(amount)}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: isPaid ? '#d1fae5' : colors.mutedBg },
                      ]}
                    >
                      <Text
                        style={{
                          color: isPaid ? '#006c49' : colors.muted,
                          fontSize: 9,
                          fontWeight: '800',
                        }}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  summaryCard: { borderRadius: Radius.lg, gap: 4, marginTop: Spacing.lg, padding: Spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  badge: { borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
});
