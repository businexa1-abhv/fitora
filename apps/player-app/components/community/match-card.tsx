import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  COMMUNITY_SKILL_LABELS,
  CommunityMatchStatus,
  formatCurrency,
  type CommunityMatchSummary,
} from '@fitora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FontSize, Radius, Spacing } from '@/constants/theme';

interface MatchCardProps {
  match: CommunityMatchSummary;
  compact?: boolean;
}

function formatMatchTime(startsAt: string) {
  const date = new Date(startsAt);
  return date.toLocaleString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function statusVariant(
  status: CommunityMatchStatus,
): 'default' | 'success' | 'warning' | 'danger' | 'primary' {
  switch (status) {
    case CommunityMatchStatus.LIVE:
      return 'danger';
    case CommunityMatchStatus.CONFIRMED:
    case CommunityMatchStatus.FULL:
      return 'success';
    case CommunityMatchStatus.WAITING_PLAYERS:
      return 'warning';
    default:
      return 'default';
  }
}

export function MatchCard({ match, compact }: MatchCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const spotsLeft = Math.max(0, match.requiredPlayers - match.confirmedCount);

  return (
    <Pressable
      onPress={() => router.push(`/community/match/${match.id}`)}
      style={({ pressed }) => [
        styles.wrapper,
        compact && styles.compact,
        pressed && styles.pressed,
      ]}
    >
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.emoji}>{match.groupEmoji ?? '🎾'}</Text>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {match.title}
            </Text>
            {match.groupName ? (
              <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
                {match.groupName}
              </Text>
            ) : null}
          </View>
          <Badge label={match.status.replace(/_/g, ' ')} variant={statusVariant(match.status)} />
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text style={[styles.meta, { color: colors.muted }]}>
            {formatMatchTime(match.startsAt)}
          </Text>
        </View>
        {match.venueLabel ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
              {match.venueLabel}
            </Text>
          </View>
        ) : null}
        <View style={styles.footer}>
          <View style={[styles.playersPill, { backgroundColor: colors.mutedBg }]}>
            <Ionicons name="people" size={14} color={colors.primary} />
            <Text style={[styles.playersText, { color: colors.foreground }]}>
              {match.confirmedCount}/{match.requiredPlayers}
            </Text>
          </View>
          {match.needsPlayers && spotsLeft > 0 ? (
            <View style={[styles.needPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.needText, { color: colors.primary }]}>Need {spotsLeft}</Text>
            </View>
          ) : null}
          {match.entryFee > 0 ? (
            <Text style={[styles.fee, { color: colors.muted }]}>
              {formatCurrency(match.entryFee)}
            </Text>
          ) : null}
        </View>
        {!compact && (
          <Text style={[styles.skill, { color: colors.muted }]}>
            {COMMUNITY_SKILL_LABELS[match.skillLevel]}
          </Text>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: 280 },
  compact: { width: 240 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  card: { gap: Spacing.sm },
  header: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  emoji: { fontSize: 28 },
  headerCopy: { flex: 1 },
  title: { fontSize: FontSize.md, fontWeight: '900' },
  subtitle: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  meta: { flex: 1, fontSize: FontSize.xs, fontWeight: '600' },
  footer: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  playersPill: {
    alignItems: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  playersText: { fontSize: FontSize.xs, fontWeight: '800' },
  needPill: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  needText: { fontSize: FontSize.xs, fontWeight: '800' },
  fee: { fontSize: FontSize.xs, fontWeight: '700', marginLeft: 'auto' },
  skill: { fontSize: FontSize.xs, fontWeight: '600' },
});
