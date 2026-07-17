import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { QueryState } from '@/components/ui';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/owner-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type Filter = 'All' | 'Training' | 'Students' | 'Leave' | 'Payment';

function categorize(type?: string, title?: string, body?: string): Filter {
  const hay = `${type ?? ''} ${title ?? ''} ${body ?? ''}`.toLowerCase();
  if (hay.includes('leave')) return 'Leave';
  if (hay.includes('pay') || hay.includes('commission') || hay.includes('payout')) return 'Payment';
  if (hay.includes('student') || hay.includes('enrollment') || hay.includes('attendance'))
    return 'Students';
  if (hay.includes('train') || hay.includes('batch') || hay.includes('session')) return 'Training';
  return 'Training';
}

function categoryMeta(cat: Filter) {
  switch (cat) {
    case 'Students':
      return { icon: 'people' as const, bg: '#e8eef8', border: '#3d4f6f', color: '#3d4f6f' };
    case 'Leave':
      return { icon: 'calendar' as const, bg: '#eee8f6', border: '#5a4f7a', color: '#5a4f7a' };
    case 'Payment':
      return {
        icon: 'wallet' as const,
        bg: CoachColors.softOrange,
        border: CoachColors.primary,
        color: CoachColors.primaryContainer,
      };
    default:
      return {
        icon: 'barbell' as const,
        bg: CoachColors.softOrange,
        border: CoachColors.primaryContainer,
        color: CoachColors.primaryContainer,
      };
  }
}

function relativeTime(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  return new Date(iso).toLocaleDateString();
}

export default function CoachNotificationsScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('All');

  const query = useQuery({
    queryKey: ['coach', 'notifications'],
    queryFn: () => listNotifications(token!),
    enabled: !!token,
  });

  const items = useMemo(() => {
    const list = query.data?.items ?? [];
    return list.map((n) => {
      const title = String(n.title ?? 'Notification');
      const body = String(n.body ?? '');
      const cat = categorize(String(n.type ?? ''), title, body);
      return {
        id: String(n.id),
        title,
        body,
        cat,
        read: Boolean(n.readAt),
        createdAt: String(n.createdAt ?? ''),
      };
    });
  }, [query.data]);

  const filtered = items.filter((n) => filter === 'All' || n.cat === filter);
  const unread = items.filter((n) => !n.read).length;

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['coach', 'notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(token!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['coach', 'notifications'] }),
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={CoachColors.brand} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread} New</Text>
        </View>
      </View>

      <View style={styles.filterHeader}>
        <Text style={styles.filterLabel}>Filter by category</Text>
        <Pressable onPress={() => markAll.mutate()} disabled={markAll.isPending}>
          <Text style={styles.markAll}>Mark all as read</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {(['All', 'Training', 'Students', 'Leave', 'Payment'] as Filter[]).map((chip) => {
          const active = filter === chip;
          return (
            <Pressable
              key={chip}
              onPress={() => setFilter(chip)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xxxl,
          gap: Spacing.sm,
        }}
      >
        <QueryState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error as Error}
          onRetry={() => query.refetch()}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={32} color={CoachColors.muted} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyBody}>Training and student alerts will show up here.</Text>
            </View>
          ) : (
            filtered.map((item) => {
              const meta = categoryMeta(item.cat);
              return (
                <Pressable
                  key={item.id}
                  style={[styles.card, { borderLeftColor: meta.border }]}
                  onPress={() => {
                    if (!item.read) markOne.mutate(item.id);
                    if (item.cat === 'Leave') router.push('/coach/leave' as never);
                    else if (item.cat === 'Students') router.push('/(tabs)/students' as never);
                    else router.push('/(tabs)/schedule' as never);
                  }}
                >
                  <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTop}>
                      <Text style={styles.catLabel}>{item.cat}</Text>
                      <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.body}>
                      {item.title}
                      {item.body ? ` — ${item.body}` : ''}
                    </Text>
                    {item.cat === 'Training' ? (
                      <Text style={styles.link}>View Batch Details ›</Text>
                    ) : null}
                  </View>
                  {!item.read ? <View style={styles.dot} /> : null}
                </Pressable>
              );
            })
          )}
        </QueryState>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: CoachColors.background, flex: 1 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { color: CoachColors.brand, fontSize: FontSize.xl, fontWeight: '800' },
  badge: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  filterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  filterLabel: { color: CoachColors.muted, fontSize: FontSize.sm },
  markAll: { color: CoachColors.brand, fontSize: FontSize.sm, fontWeight: '700' },
  chips: { marginTop: Spacing.md, paddingHorizontal: Spacing.lg },
  chip: {
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: CoachColors.brand },
  chipText: { color: CoachColors.brand, fontSize: FontSize.sm, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  card: {
    alignItems: 'flex-start',
    backgroundColor: CoachColors.card,
    borderLeftWidth: 4,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  catLabel: { color: CoachColors.muted, fontSize: FontSize.xs, fontWeight: '700' },
  time: { color: CoachColors.muted, fontSize: FontSize.xs },
  body: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '600', marginTop: 4 },
  link: { color: CoachColors.brand, fontSize: FontSize.xs, fontWeight: '700', marginTop: 6 },
  dot: {
    backgroundColor: CoachColors.danger,
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  empty: { alignItems: 'center', marginTop: Spacing.xxxl, padding: Spacing.xl },
  emptyTitle: {
    color: CoachColors.foreground,
    fontSize: FontSize.md,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  emptyBody: { color: CoachColors.muted, fontSize: FontSize.sm, marginTop: 4, textAlign: 'center' },
});
