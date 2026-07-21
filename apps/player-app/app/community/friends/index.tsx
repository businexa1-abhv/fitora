import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { CommunityFriendshipStatus } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { EmptyCommunity } from '@/components/community/empty-community';
import { listFriends, respondFriendRequest } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const friendsQuery = useQuery({
    queryKey: ['community', 'friends'],
    queryFn: () => listFriends(token!),
    enabled: !!token,
  });

  const respondMutation = useMutation({
    mutationFn: (payload: { friendshipId: string; accept: boolean }) =>
      respondFriendRequest(token!, payload.friendshipId, payload.accept),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'friends'] }),
  });

  const friends = friendsQuery.data ?? [];
  const accepted = friends.filter((f) => f.status === CommunityFriendshipStatus.ACCEPTED);
  const pending = friends.filter((f) => f.status === CommunityFriendshipStatus.PENDING);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Friends"
        showBack
        rightAction={
          <Pressable onPress={() => router.push('/community/friends/find' as Href)}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>Find</Text>
          </Pressable>
        }
      />
      <QueryState
        isLoading={friendsQuery.isLoading}
        isError={friendsQuery.isError}
        error={friendsQuery.error}
        onRetry={() => friendsQuery.refetch()}
      >
        <FlatList
          data={[...pending, ...accepted]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            pending.length > 0 ? (
              <Text style={[styles.section, { color: colors.foreground }]}>Pending Requests</Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyCommunity
              title="No friends yet"
              message="Find players and build your sports network."
              actionLabel="Find Friends"
              onAction={() => router.push('/community/friends/find' as Href)}
            />
          }
          renderItem={({ item }) => (
            <View
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.avatarText}>🎾</Text>
              </View>
              <View style={styles.copy}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {item.user.firstName} {item.user.lastName}
                </Text>
                <Text style={[styles.meta, { color: colors.muted }]}>{item.status}</Text>
              </View>
              {item.status === CommunityFriendshipStatus.PENDING ? (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => respondMutation.mutate({ friendshipId: item.id, accept: true })}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '800' }}>Accept</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => respondMutation.mutate({ friendshipId: item.id, accept: false })}
                  >
                    <Text style={{ color: colors.danger, fontWeight: '800' }}>Decline</Text>
                  </Pressable>
                </View>
              ) : null}
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
  section: { fontSize: FontSize.lg, fontWeight: '900', marginBottom: Spacing.sm },
  row: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { fontSize: 22 },
  copy: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '900' },
  meta: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  actions: { alignItems: 'flex-end', gap: Spacing.xs },
});
