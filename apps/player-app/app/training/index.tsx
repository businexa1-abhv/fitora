import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { QueryState } from '@/components/query-state';
import { getPrograms } from '@/lib/training';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function TrainingProgramsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const programsQuery = useQuery({
    queryKey: ['training', 'programs'],
    queryFn: () => getPrograms(),
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Training" subtitle="Programs and batch enrollments" showBack />
      <QueryState
        isLoading={programsQuery.isLoading}
        isError={programsQuery.isError}
        error={programsQuery.error as Error}
        onRetry={() => programsQuery.refetch()}
      >
        <FlatList
          data={programsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            gap: Spacing.md,
            padding: Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xxxl,
          }}
          ListEmptyComponent={
            <Text style={{ color: colors.muted, textAlign: 'center' }}>
              No training programs available yet.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/training/${item.id}`)}>
              <Card style={styles.card}>
                <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="fitness" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: FontSize.sm }} numberOfLines={2}>
                    {item.description ?? 'Training program'}
                  </Text>
                  {item.fee != null ? (
                    <Text style={{ color: colors.accent, fontWeight: '800', marginTop: 4 }}>
                      {formatCurrency(Number(item.fee))}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            </Pressable>
          )}
        />
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: { fontSize: FontSize.md, fontWeight: '900' },
});
