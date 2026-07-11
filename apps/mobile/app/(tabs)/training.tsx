import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPORT_LABELS, SportType, formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { SPORT_EMOJI } from '@/lib/constants';
import { getPrograms } from '@/lib/training';
import { FontSize, Spacing } from '@/constants/theme';

export default function TrainingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const programsQuery = useQuery({
    queryKey: ['training', 'programs'],
    queryFn: () => getPrograms(),
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Kids training</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Enroll your child in coaching programs near you
        </Text>
      </View>

      <QueryState
        isLoading={programsQuery.isLoading}
        isError={programsQuery.isError}
        error={programsQuery.error as Error}
        onRetry={() => programsQuery.refetch()}
      >
        <FlatList
          data={programsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>No programs available yet</Text>
          }
          renderItem={({ item }) => {
            const sport: SportType = (item.sportType as SportType | null) ?? SportType.OTHER;
            return (
              <Pressable onPress={() => router.push(`/training/${item.id}`)}>
              <Card>
                <View style={styles.cardTop}>
                  <View style={[styles.emojiBox, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.emoji}>{SPORT_EMOJI[sport]}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.programName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.venue, { color: colors.muted }]}>
                      {item.court?.name} · {item.court?.city}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.metaRow}>
                  <Badge label={`Ages ${item.minAge}–${item.maxAge}`} variant="default" />
                  <Badge label={SPORT_LABELS[sport]} variant="primary" />
                </View>
                <View style={styles.footer}>
                  <View>
                    <Text style={[styles.feeLabel, { color: colors.muted }]}>Monthly fee</Text>
                    <Text style={[styles.fee, { color: colors.primary }]}>
                      {formatCurrency(Number(item.fee))}
                    </Text>
                  </View>
                  <Text style={[styles.batches, { color: colors.muted }]}>
                    {item.batches?.length ?? 0} batches
                  </Text>
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
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.hero, fontWeight: '800' },
  subtitle: { fontSize: FontSize.md, marginTop: 4 },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  cardTop: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  emojiBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  cardContent: { flex: 1 },
  programName: { fontSize: FontSize.lg, fontWeight: '800' },
  venue: { fontSize: FontSize.sm, marginTop: 2 },
  description: { fontSize: FontSize.sm, marginBottom: Spacing.sm },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  feeLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  fee: { fontSize: FontSize.xl, fontWeight: '800' },
  batches: { fontSize: FontSize.sm },
  empty: { textAlign: 'center', paddingTop: 40 },
});
