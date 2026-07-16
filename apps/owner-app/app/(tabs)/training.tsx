import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EnrollmentStatus } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { getTrainerBatches } from '@/lib/trainer-api';
import { FontSize, Spacing } from '@/constants/theme';

export default function TrainingScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches'],
    queryFn: () => getTrainerBatches(token!),
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
      <Text style={[styles.title, { color: colors.foreground }]}>Training</Text>
      <Text style={{ color: colors.muted, fontSize: FontSize.sm, marginTop: 4 }}>
        Your assigned training batches
      </Text>

      <QueryState
        isLoading={batchesQuery.isLoading}
        isError={batchesQuery.isError}
        error={batchesQuery.error as Error}
        onRetry={() => batchesQuery.refetch()}
      >
        {(batchesQuery.data ?? []).length === 0 ? (
          <Card style={{ marginTop: Spacing.xl, alignItems: 'center', padding: Spacing.xl }}>
            <Ionicons name="school-outline" size={32} color={colors.muted} />
            <Text style={{ color: colors.foreground, fontWeight: '800', marginTop: Spacing.md }}>
              No batches assigned
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
            {(batchesQuery.data ?? []).map((batch) => {
              const activeCount =
                batch.enrollments?.filter((e) => e.status === EnrollmentStatus.ACTIVE).length ?? 0;
              return (
                <Card key={batch.id} style={styles.batchCard}>
                  <View style={styles.batchTop}>
                    <Text style={[styles.batchName, { color: colors.foreground }]}>
                      {batch.name}
                    </Text>
                    <View style={[styles.pill, { backgroundColor: colors.primaryContainer }]}>
                      <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>
                        {activeCount}/{batch.maxCapacity ?? '—'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: FontSize.sm, marginTop: 4 }}>
                    {batch.program?.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Text style={{ color: colors.foreground, fontSize: FontSize.sm, flex: 1 }}>
                      {batch.schedule}
                    </Text>
                  </View>
                  {batch.program?.court ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={14} color={colors.muted} />
                      <Text style={{ color: colors.muted, fontSize: FontSize.sm, flex: 1 }}>
                        {batch.program.court.name}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  batchCard: { gap: 4 },
  batchTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  batchName: { flex: 1, fontSize: FontSize.md, fontWeight: '800', marginRight: Spacing.sm },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
