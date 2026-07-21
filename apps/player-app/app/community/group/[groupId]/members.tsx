import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { EmptyCommunity } from '@/components/community/empty-community';
import { getGroupMembers } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function GroupMembersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();

  const membersQuery = useQuery({
    queryKey: ['community', 'members', groupId],
    queryFn: () => getGroupMembers(token!, groupId!),
    enabled: !!token && !!groupId,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Members" showBack />
      <QueryState
        isLoading={membersQuery.isLoading}
        isError={membersQuery.isError}
        error={membersQuery.error}
        onRetry={() => membersQuery.refetch()}
      >
        <FlatList
          data={membersQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyCommunity
              title="No members yet"
              message="Members will appear here once they join."
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
              <Badge label={item.role} variant="primary" />
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
});
