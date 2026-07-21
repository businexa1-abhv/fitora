import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { EmptyCommunity } from '@/components/community/empty-community';
import { getCommunityFeed } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CommunityFeedScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const feedQuery = useQuery({
    queryKey: ['community', 'feed'],
    queryFn: () => getCommunityFeed(token!),
    enabled: !!token,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Community Feed" showBack />
      <QueryState
        isLoading={feedQuery.isLoading}
        isError={feedQuery.isError}
        error={feedQuery.error}
        onRetry={() => feedQuery.refetch()}
      >
        <FlatList
          data={feedQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyCommunity
              title="Feed is quiet"
              message="Matches, wins, and group updates will show up here."
            />
          }
          renderItem={({ item }) => (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.type, { color: colors.accent }]}>
                {item.type.replace(/_/g, ' ')}
              </Text>
              <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
              {item.body ? (
                <Text style={[styles.body, { color: colors.muted }]}>{item.body}</Text>
              ) : null}
              <Text style={[styles.when, { color: colors.muted }]}>
                {new Date(item.createdAt).toLocaleString('en-IN')}
              </Text>
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
  card: { borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.xs, padding: Spacing.lg },
  type: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: { fontSize: FontSize.lg, fontWeight: '900' },
  body: { fontSize: FontSize.sm, lineHeight: 20 },
  when: { fontSize: FontSize.xs, fontWeight: '600', marginTop: Spacing.xs },
});
