import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NotificationItem } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type FilterKey = 'all' | 'alerts' | 'payments' | 'requests';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

function classify(item: NotificationItem): FilterKey {
  const type = `${item.type} ${item.title} ${item.body}`.toLowerCase();
  if (type.includes('payment') || type.includes('invoice') || type.includes('refund')) {
    return 'payments';
  }
  if (
    type.includes('request') ||
    type.includes('membership') ||
    type.includes('application') ||
    type.includes('booking')
  ) {
    return 'requests';
  }
  if (type.includes('alert') || type.includes('maintenance') || type.includes('warning')) {
    return 'alerts';
  }
  return 'alerts';
}

function visualFor(filter: FilterKey) {
  switch (filter) {
    case 'payments':
      return {
        icon: 'checkmark-circle' as const,
        bg: '#d1fae5',
        color: '#006c49',
        label: 'PAYMENT',
      };
    case 'requests':
      return { icon: 'person-add' as const, bg: '#e1e0ff', color: '#15157d', label: 'REQUEST' };
    default:
      return { icon: 'warning' as const, bg: '#fee2e2', color: '#ba1a1a', label: 'ALERT' };
  }
}

export default function NotificationsCenterScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('all');

  const notificationsQuery = useQuery({
    queryKey: ['owner', 'notifications'],
    queryFn: () => listNotifications(token!),
    enabled: !!token,
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['owner', 'notifications'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['owner', 'notifications'] });
    },
  });

  const items = notificationsQuery.data?.items ?? [];
  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => classify(item) === filter)),
    [filter, items],
  );

  const filters: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'alerts', label: 'Alerts' },
    { key: 'payments', label: 'Payments' },
    { key: 'requests', label: 'Requests' },
  ];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="karate" size={22} color={colors.primary} />
          <Text style={[styles.brand, { color: colors.primary }]}>FitOra Academy</Text>
        </View>
        <Ionicons name="search-outline" size={22} color={colors.muted} />
      </View>

      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        <Pressable onPress={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
          <Text style={{ color: colors.muted, fontSize: FontSize.sm, fontWeight: '700' }}>
            Mark all as read
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: Spacing.lg }}
      >
        <View style={styles.chips}>
          {filters.map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.secondaryContainer : colors.card,
                    borderColor: active ? colors.secondaryContainer : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.secondary : colors.foreground,
                    fontWeight: '800',
                    fontSize: FontSize.sm,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <QueryState
        isLoading={notificationsQuery.isLoading}
        isError={notificationsQuery.isError}
        error={notificationsQuery.error as Error}
        onRetry={() => notificationsQuery.refetch()}
        empty={filtered.length === 0}
      >
        <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
          {filtered.map((item) => {
            const kind = classify(item);
            const visual = visualFor(kind);
            const unread = !item.readAt;
            return (
              <Card
                key={item.id}
                style={[
                  styles.card,
                  unread && { borderColor: colors.primaryContainer, borderWidth: 1.5 },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: visual.bg }]}>
                    <Ionicons name={visual.icon} size={18} color={visual.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.metaRow}>
                      <Text style={{ color: visual.color, fontSize: 10, fontWeight: '800' }}>
                        {visual.label}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: FontSize.xs }}>
                        {timeAgo(item.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardBody, { color: colors.muted }]}>{item.body}</Text>
                  </View>
                </View>
                {kind === 'alerts' && unread ? (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => markOneMutation.mutate(item.id)}
                      style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.primaryBtnText}>View Details</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => markOneMutation.mutate(item.id)}
                      style={[styles.outlineBtn, { borderColor: colors.border }]}
                    >
                      <Text style={{ color: colors.muted, fontWeight: '700' }}>Dismiss</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>

        <Pressable
          onPress={() => notificationsQuery.refetch()}
          style={[styles.loadMore, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Load older notifications</Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  titleRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  title: { fontSize: FontSize.hero, fontWeight: '800' },
  chips: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  card: { gap: Spacing.md },
  cardTop: { flexDirection: 'row', gap: Spacing.md },
  iconBox: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800' },
  cardBody: { fontSize: FontSize.sm, lineHeight: 20, marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  primaryBtn: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  outlineBtn: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  loadMore: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
});
