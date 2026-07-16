import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { getTrainerSchedule } from '@/lib/trainer-api';
import { formatDate } from '@/lib/trainer-utils';
import { FontSize, Spacing } from '@/constants/theme';

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const scheduleQuery = useQuery({
    queryKey: ['trainer', 'schedule'],
    queryFn: async () => {
      const result = await getTrainerSchedule(token!);
      return result.items;
    },
    enabled: !!token,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Schedule</Text>
      <Text style={{ color: colors.muted, fontSize: FontSize.sm, marginTop: 4 }}>
        Your assigned training batches and session timings
      </Text>

      <QueryState
        isLoading={scheduleQuery.isLoading}
        isError={scheduleQuery.isError}
        error={scheduleQuery.error as Error}
        onRetry={() => scheduleQuery.refetch()}
      >
        {(scheduleQuery.data ?? []).length === 0 ? (
          <Card style={{ marginTop: Spacing.xl, alignItems: 'center', padding: Spacing.xl }}>
            <Ionicons name="calendar-outline" size={32} color={colors.muted} />
            <Text style={{ color: colors.foreground, fontWeight: '800', marginTop: Spacing.md }}>
              No scheduled batches
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: FontSize.sm,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              Contact the court owner for batch assignments
            </Text>
          </Card>
        ) : (
          <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
            {(scheduleQuery.data ?? []).map((item) => (
              <Card key={item.batchId} style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={[styles.batchName, { color: colors.foreground }]}>
                    {item.batchName}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>
                      {item.activeStudents}/{item.maxCapacity}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: colors.muted, fontSize: FontSize.sm, marginTop: 4 }}>
                  {item.program.name}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontSize: FontSize.sm, flex: 1 }}>
                    {item.schedule}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color={colors.muted} />
                  <Text style={{ color: colors.muted, fontSize: FontSize.sm, flex: 1 }}>
                    {item.court.name}, {item.court.city}
                  </Text>
                </View>
                {item.startDate || item.endDate ? (
                  <Text
                    style={{ color: colors.muted, fontSize: FontSize.xs, marginTop: Spacing.sm }}
                  >
                    {item.startDate ? formatDate(item.startDate) : '—'} –{' '}
                    {item.endDate ? formatDate(item.endDate) : 'ongoing'}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  card: { gap: 2 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  batchName: { flex: 1, fontSize: FontSize.md, fontWeight: '800', marginRight: Spacing.sm },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
