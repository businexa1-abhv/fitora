import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { EmptyCommunity } from '@/components/community/empty-community';
import { getGroupMedia } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function GroupMediaScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();

  const mediaQuery = useQuery({
    queryKey: ['community', 'media', groupId],
    queryFn: () => getGroupMedia(token!, groupId!),
    enabled: !!token && !!groupId,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Media" showBack />
      <QueryState
        isLoading={mediaQuery.isLoading}
        isError={mediaQuery.isError}
        error={mediaQuery.error}
        onRetry={() => mediaQuery.refetch()}
      >
        <FlatList
          data={mediaQuery.data ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyCommunity
              title="No media yet"
              message="Photos and videos shared in chat will appear here."
            />
          }
          renderItem={({ item }) => (
            <View
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={styles.tileEmoji}>🖼️</Text>
              <Text style={[styles.tileMeta, { color: colors.muted }]} numberOfLines={2}>
                {item.author.firstName} · {new Date(item.createdAt).toLocaleDateString('en-IN')}
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
  row: { gap: Spacing.md },
  tile: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: 140,
    padding: Spacing.md,
  },
  tileEmoji: { fontSize: 36 },
  tileMeta: { fontSize: FontSize.xs, fontWeight: '600', textAlign: 'center' },
});
