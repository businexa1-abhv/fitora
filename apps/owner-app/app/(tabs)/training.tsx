import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EnrollmentStatus } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { getTrainerBatches } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Spacing } from '@/constants/theme';

export default function TrainingScreen() {
  const { colors } = useTheme();
  const { token, isCoachMode } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  const bg = isCoachMode ? CoachColors.background : colors.background;
  const fg = isCoachMode ? CoachColors.foreground : colors.foreground;
  const muted = isCoachMode ? CoachColors.muted : colors.muted;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <Text style={[styles.title, { color: fg }]}>Training</Text>
      <Text style={{ color: muted, fontSize: FontSize.sm, marginTop: 4 }}>
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
            <Ionicons name="school-outline" size={32} color={muted} />
            <Text style={{ color: fg, fontWeight: '800', marginTop: Spacing.md }}>
              No batches assigned
            </Text>
            <Text
              style={{
                color: muted,
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
                <Pressable
                  key={batch.id}
                  onPress={() =>
                    router.push({
                      pathname: '/coach/batch/[batchId]',
                      params: { batchId: batch.id },
                    } as never)
                  }
                >
                  <Card style={styles.batchCard}>
                    <View style={styles.batchTop}>
                      <Text style={[styles.batchName, { color: fg }]}>{batch.name}</Text>
                      <View
                        style={[
                          styles.pill,
                          {
                            backgroundColor: isCoachMode
                              ? CoachColors.softOrange
                              : colors.primaryContainer,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isCoachMode ? CoachColors.primary : colors.primary,
                            fontSize: 10,
                            fontWeight: '800',
                          }}
                        >
                          {activeCount}/{batch.maxCapacity ?? '—'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: muted, fontSize: FontSize.sm, marginTop: 4 }}>
                      {batch.program?.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={14} color={muted} />
                      <Text style={{ color: muted, fontSize: FontSize.xs, flex: 1 }}>
                        {batch.schedule || 'Schedule TBD'}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={muted} />
                    </View>
                  </Card>
                </Pressable>
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
  batchCard: { gap: 2 },
  batchTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  batchName: { flex: 1, fontSize: FontSize.md, fontWeight: '800', marginRight: Spacing.sm },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: Spacing.sm },
});
