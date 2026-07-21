import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { EmptyCommunity } from '@/components/community/empty-community';
import { getGroupPolls, votePoll } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function GroupPollsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const pollsQuery = useQuery({
    queryKey: ['community', 'polls', groupId],
    queryFn: () => getGroupPolls(token!, groupId!),
    enabled: !!token && !!groupId,
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      votePoll(token!, pollId, optionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['community', 'polls', groupId] });
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Polls" showBack />
      <QueryState
        isLoading={pollsQuery.isLoading}
        isError={pollsQuery.isError}
        error={pollsQuery.error}
        onRetry={() => pollsQuery.refetch()}
      >
        <FlatList
          data={pollsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyCommunity
              title="No polls yet"
              message="Group polls will appear here when created."
            />
          }
          renderItem={({ item }) => (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.question, { color: colors.foreground }]}>{item.question}</Text>
              {item.options.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => voteMutation.mutate({ pollId: item.id, optionId: option.id })}
                  style={[
                    styles.option,
                    {
                      backgroundColor: option.votedByMe ? colors.primaryLight : colors.mutedBg,
                      borderColor: option.votedByMe ? colors.primary : 'transparent',
                      borderWidth: option.votedByMe ? 1.5 : 0,
                    },
                  ]}
                >
                  <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionCount, { color: colors.primary }]}>
                    {option.voteCount}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { gap: Spacing.md, padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  card: { borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg },
  question: { fontSize: FontSize.lg, fontWeight: '900', marginBottom: Spacing.xs },
  option: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  optionLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  optionCount: { fontSize: FontSize.sm, fontWeight: '900' },
});
