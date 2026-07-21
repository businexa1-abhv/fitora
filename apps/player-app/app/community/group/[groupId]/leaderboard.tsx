import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { EmptyCommunity } from '@/components/community/empty-community';
import { getGroupLeaderboard } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function GroupLeaderboardScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();

  const leaderboardQuery = useQuery({
    queryKey: ['community', 'leaderboard', groupId],
    queryFn: () => getGroupLeaderboard(token!, groupId!),
    enabled: !!token && !!groupId,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Leaderboard" showBack />
      <QueryState
        isLoading={leaderboardQuery.isLoading}
        isError={leaderboardQuery.isError}
        error={leaderboardQuery.error}
        onRetry={() => leaderboardQuery.refetch()}
      >
        <FlatList
          data={leaderboardQuery.data ?? []}
          keyExtractor={(item) => String(item.rank)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyCommunity
              title="No leaderboard yet"
              message="Play more matches to climb the ranks."
            />
          }
          renderItem={({ item }) => (
            <View
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.rank, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.rankText, { color: colors.primary }]}>#{item.rank}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {item.user.firstName} {item.user.lastName}
                </Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {item.matchesPlayed} matches · {item.wins} wins
                </Text>
              </View>
              <Text style={[styles.points, { color: colors.accent }]}>{item.points} pts</Text>
            </View>
          )}
        />
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { gap: Spacing.sm, padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  row: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  rank: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rankText: { fontSize: FontSize.sm, fontWeight: '900' },
  copy: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '900' },
  meta: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  points: { fontSize: FontSize.md, fontWeight: '900' },
});
