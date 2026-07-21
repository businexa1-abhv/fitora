import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COMMUNITY_GROUP_TYPE_LABELS, type CommunityGroupSummary } from '@fitora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FontSize, Radius, Spacing } from '@/constants/theme';

interface GroupCardProps {
  group: CommunityGroupSummary;
  compact?: boolean;
}

export function GroupCard({ group, compact }: GroupCardProps) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/community/group/${group.id}`)}
      style={({ pressed }) => [
        styles.wrapper,
        compact && styles.compact,
        pressed && styles.pressed,
      ]}
    >
      <Card padded={false} style={styles.card}>
        <View style={[styles.hero, { backgroundColor: colors.primaryLight }]}>
          {group.coverPhotoUrl ? (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.mutedBg }]} />
          ) : (
            <Text style={styles.emoji}>{group.emoji ?? '🏸'}</Text>
          )}
          {group.isTrending && (
            <View style={[styles.trending, { backgroundColor: colors.accent }]}>
              <Text style={styles.trendingText}>Trending</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
            {COMMUNITY_GROUP_TYPE_LABELS[group.groupType]}
            {group.locationLabel ? ` · ${group.locationLabel}` : ''}
          </Text>
          <View style={styles.footer}>
            <View style={styles.stat}>
              <Ionicons name="people" size={14} color={colors.muted} />
              <Text style={[styles.statText, { color: colors.muted }]}>{group.memberCount}</Text>
            </View>
            {group.myRole ? <Badge label={group.myRole} variant="primary" /> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: 220 },
  compact: { width: 180 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  card: { overflow: 'hidden' },
  hero: { alignItems: 'center', height: 88, justifyContent: 'center' },
  coverPlaceholder: { ...StyleSheet.absoluteFillObject },
  emoji: { fontSize: 36 },
  trending: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
  },
  trendingText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
  body: { gap: 4, padding: Spacing.md },
  name: { fontSize: FontSize.md, fontWeight: '900' },
  meta: { fontSize: FontSize.xs, fontWeight: '600' },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  stat: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  statText: { fontSize: FontSize.xs, fontWeight: '700' },
});
