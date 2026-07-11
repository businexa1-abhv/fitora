import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingStatus, formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { getMyBookings } from '@/lib/courts';
import { FontSize, Spacing } from '@/constants/theme';

export default function BookingsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'my'],
    queryFn: () => getMyBookings(token!),
    enabled: !!token,
  });

  const bookings = bookingsQuery.data?.items ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="My bookings" subtitle={`${bookingsQuery.data?.total ?? 0} total`} showBack />

      <QueryState
        isLoading={bookingsQuery.isLoading}
        isError={bookingsQuery.isError}
        error={bookingsQuery.error as Error}
        onRetry={() => bookingsQuery.refetch()}
      >
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>No bookings yet</Text>
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <View style={styles.content}>
                  <Text style={[styles.court, { color: colors.foreground }]}>{item.court?.name}</Text>
                  <Text style={[styles.time, { color: colors.muted }]}>
                    {item.slot
                      ? new Date(item.slot.startTime).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : ''}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Badge
                    label={item.status}
                    variant={item.status === BookingStatus.CONFIRMED ? 'success' : 'default'}
                  />
                  <Text style={[styles.amount, { color: colors.primary }]}>
                    {formatCurrency(Number(item.totalAmount))}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  content: { flex: 1 },
  court: { fontSize: FontSize.md, fontWeight: '800' },
  time: { fontSize: FontSize.sm, marginTop: 4 },
  right: { alignItems: 'flex-end', gap: Spacing.xs },
  amount: { fontSize: FontSize.md, fontWeight: '800' },
  empty: { textAlign: 'center', paddingTop: 40 },
});
