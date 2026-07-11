import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPORT_LABELS, SportType, formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { SPORT_EMOJI } from '@/lib/constants';
import { getProgram } from '@/lib/training';
import { FontSize, Spacing } from '@/constants/theme';

export default function ProgramDetailScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const programQuery = useQuery({
    queryKey: ['training', 'program', programId],
    queryFn: () => getProgram(token!, programId!),
    enabled: !!token && !!programId,
  });

  const program = programQuery.data;
  const sport: SportType = (program?.sportType as SportType | null) ?? SportType.OTHER;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Program" showBack />

      <QueryState
        isLoading={programQuery.isLoading}
        isError={programQuery.isError}
        error={programQuery.error as Error}
        onRetry={() => programQuery.refetch()}
      >
        {program ? (
          <FlatList
            data={program.batches ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
            ListHeaderComponent={
              <View style={styles.header}>
                <Text style={styles.emoji}>{SPORT_EMOJI[sport]}</Text>
                <Text style={[styles.name, { color: colors.foreground }]}>{program.name}</Text>
                <Text style={[styles.venue, { color: colors.muted }]}>
                  {program.court?.name} · {program.court?.city}
                </Text>
                <View style={styles.badges}>
                  <Badge label={`Ages ${program.minAge}–${program.maxAge}`} variant="default" />
                  <Badge label={SPORT_LABELS[sport]} variant="primary" />
                </View>
                <Text style={[styles.fee, { color: colors.primary }]}>
                  {formatCurrency(Number(program.fee))}/month
                </Text>
                {program.description ? (
                  <Text style={[styles.description, { color: colors.muted }]}>{program.description}</Text>
                ) : null}
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available batches</Text>
              </View>
            }
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.muted }]}>No batches open for enrollment</Text>
            }
            renderItem={({ item }) => (
              <Card>
                <Text style={[styles.batchName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.schedule, { color: colors.muted }]}>{item.schedule}</Text>
                <Text style={[styles.capacity, { color: colors.muted }]}>
                  {item._count?.enrollments ?? 0}/{item.maxCapacity} enrolled
                </Text>
                <Button
                  label="Enroll"
                  size="sm"
                  onPress={() =>
                    router.push({
                      pathname: '/training/enroll/[batchId]',
                      params: { batchId: item.id, program: program.name },
                    })
                  }
                />
              </Card>
            )}
          />
        ) : null}
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  header: { gap: Spacing.sm, marginBottom: Spacing.md },
  emoji: { fontSize: 40 },
  name: { fontSize: FontSize.xxl, fontWeight: '800' },
  venue: { fontSize: FontSize.sm },
  badges: { flexDirection: 'row', gap: Spacing.sm },
  fee: { fontSize: FontSize.xl, fontWeight: '800' },
  description: { fontSize: FontSize.md, lineHeight: 22 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginTop: Spacing.md },
  batchName: { fontSize: FontSize.md, fontWeight: '800' },
  schedule: { fontSize: FontSize.sm, marginTop: 4 },
  capacity: { fontSize: FontSize.sm, marginBottom: Spacing.sm },
  empty: { textAlign: 'center', paddingTop: 20 },
});
