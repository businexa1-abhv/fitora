import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { EmptyCommunity } from '@/components/community/empty-community';
import { getJoinRequests, reviewJoinRequest } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function GroupAdminScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ['community', 'join-requests', groupId],
    queryFn: () => getJoinRequests(token!, groupId!),
    enabled: !!token && !!groupId,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { requestId: string; action: 'approve' | 'reject' | 'waitlist' }) =>
      reviewJoinRequest(token!, groupId!, payload.requestId, payload.action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community', 'join-requests', groupId] });
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Admin Panel" showBack subtitle="Manage join requests" />
      <QueryState
        isLoading={requestsQuery.isLoading}
        isError={requestsQuery.isError}
        error={requestsQuery.error}
        onRetry={() => requestsQuery.refetch()}
      >
        <FlatList
          data={requestsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyCommunity
              title="No pending requests"
              message="New join requests will show up here."
            />
          }
          renderItem={({ item }) => (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.name, { color: colors.foreground }]}>
                {item.user.firstName} {item.user.lastName}
              </Text>
              {item.message ? (
                <Text style={[styles.message, { color: colors.muted }]}>{item.message}</Text>
              ) : null}
              <View style={styles.actions}>
                <ActionBtn
                  label="Approve"
                  tint={colors.primary}
                  onPress={() => reviewMutation.mutate({ requestId: item.id, action: 'approve' })}
                />
                <ActionBtn
                  label="Waitlist"
                  tint={colors.accent}
                  onPress={() => reviewMutation.mutate({ requestId: item.id, action: 'waitlist' })}
                />
                <ActionBtn
                  label="Reject"
                  tint={colors.danger}
                  onPress={() => reviewMutation.mutate({ requestId: item.id, action: 'reject' })}
                />
              </View>
            </View>
          )}
        />
      </QueryState>
    </View>
  );
}

function ActionBtn({ label, tint, onPress }: { label: string; tint: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, { backgroundColor: colors.mutedBg }]}>
      <Text style={[styles.actionText, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { gap: Spacing.md, padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  card: { borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg },
  name: { fontSize: FontSize.md, fontWeight: '900' },
  message: { fontSize: FontSize.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { borderRadius: Radius.full, flex: 1, paddingVertical: Spacing.sm },
  actionText: { fontSize: FontSize.xs, fontWeight: '900', textAlign: 'center' },
});
