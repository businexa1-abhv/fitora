import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications(token!),
    enabled: !!token,
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = notificationsQuery.data?.items ?? [];
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Notifications"
        subtitle={`${unread} unread`}
        showBack
        rightAction={
          <Pressable onPress={() => markAllMutation.mutate()} hitSlop={8}>
            <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        }
      />

      <QueryState
        isLoading={notificationsQuery.isLoading}
        isError={notificationsQuery.isError}
        error={notificationsQuery.error as Error}
        onRetry={() => notificationsQuery.refetch()}
      >
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>No notifications yet</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => !item.readAt && markReadMutation.mutate(item.id)}
              style={[
                styles.item,
                {
                  backgroundColor: item.readAt ? colors.card : colors.primaryLight,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: colors.mutedBg }]}>
                <Ionicons name="notifications" size={18} color={colors.primary} />
              </View>
              <View style={styles.content}>
                <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.body, { color: colors.muted }]} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={[styles.time, { color: colors.muted }]}>
                  {new Date(item.createdAt).toLocaleString('en-IN')}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  markAll: { fontSize: FontSize.sm, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  item: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: FontSize.md, fontWeight: '700' },
  body: { fontSize: FontSize.sm, marginTop: 2 },
  time: { fontSize: FontSize.xs, marginTop: 4 },
  empty: { textAlign: 'center', paddingTop: 40 },
});
