import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { getMatch } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function MatchLiveScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();

  const matchQuery = useQuery({
    queryKey: ['community', 'match', matchId],
    queryFn: () => getMatch(token!, matchId!),
    enabled: !!token && !!matchId,
    refetchInterval: 15_000,
  });

  const match = matchQuery.data;
  const checkedIn = match?.players.filter((p) => p.checkedInAt).length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Live Match" showBack />
      <QueryState
        isLoading={matchQuery.isLoading}
        isError={matchQuery.isError}
        error={matchQuery.error}
        onRetry={() => matchQuery.refetch()}
      >
        {!match ? null : (
          <View style={styles.content}>
            <View
              style={[
                styles.liveCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Badge label="LIVE" variant="danger" />
              <Text style={[styles.title, { color: colors.foreground }]}>{match.title}</Text>
              <View style={styles.scoreRow}>
                <Text style={[styles.score, { color: colors.primary }]}>
                  {match.scoreHome ?? 0}
                </Text>
                <Text style={[styles.scoreSep, { color: colors.muted }]}>:</Text>
                <Text style={[styles.score, { color: colors.accent }]}>{match.scoreAway ?? 0}</Text>
              </View>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {checkedIn}/{match.players.length} checked in
              </Text>
              <View style={[styles.timer, { backgroundColor: colors.mutedBg }]}>
                <Text style={[styles.timerText, { color: colors.foreground }]}>
                  Time remaining — coming soon
                </Text>
              </View>
            </View>
          </View>
        )}
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl },
  liveCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.xxxl,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '900', textAlign: 'center' },
  scoreRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.lg },
  score: { fontSize: 48, fontWeight: '900' },
  scoreSep: { fontSize: FontSize.xxl, fontWeight: '900' },
  meta: { fontSize: FontSize.sm, fontWeight: '700' },
  timer: {
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  timerText: { fontSize: FontSize.sm, fontWeight: '800' },
});
