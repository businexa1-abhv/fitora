import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { CommunityRsvpStatus } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMatch, rsvpMatch } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const RSVP_OPTIONS: { label: string; value: CommunityRsvpStatus }[] = [
  { label: "I'm Coming", value: CommunityRsvpStatus.COMING },
  { label: 'Maybe', value: CommunityRsvpStatus.MAYBE },
  { label: 'Not Coming', value: CommunityRsvpStatus.NOT_COMING },
  { label: 'Late', value: CommunityRsvpStatus.LATE },
  { label: 'Need Pickup', value: CommunityRsvpStatus.NEED_PICKUP },
  { label: 'Need Partner', value: CommunityRsvpStatus.NEED_PARTNER },
  { label: 'Bring Shuttle', value: CommunityRsvpStatus.BRING_SHUTTLE },
  { label: 'Bring Ball', value: CommunityRsvpStatus.BRING_BALL },
  { label: 'Need Racquet', value: CommunityRsvpStatus.NEED_RACQUET },
];

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const matchQuery = useQuery({
    queryKey: ['community', 'match', matchId],
    queryFn: () => getMatch(token!, matchId!),
    enabled: !!token && !!matchId,
  });

  const rsvpMutation = useMutation({
    mutationFn: (rsvp: CommunityRsvpStatus) => rsvpMatch(token!, matchId!, rsvp),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'match', matchId] }),
  });

  const match = matchQuery.data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={match?.title ?? 'Match'} showBack />
      <QueryState
        isLoading={matchQuery.isLoading}
        isError={matchQuery.isError}
        error={matchQuery.error}
        onRetry={() => matchQuery.refetch()}
      >
        {!match ? null : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.hero, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.emoji}>{match.groupEmoji ?? '🎾'}</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>{match.title}</Text>
              <Badge label={match.status.replace(/_/g, ' ')} variant="primary" />
              <Text style={[styles.meta, { color: colors.muted }]}>
                {match.confirmedCount}/{match.requiredPlayers} confirmed
              </Text>
            </View>

            {match.venueLabel ? (
              <Text style={[styles.venue, { color: colors.foreground }]}>{match.venueLabel}</Text>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your RSVP</Text>
            <View style={styles.rsvpGrid}>
              {RSVP_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => rsvpMutation.mutate(option.value)}
                  style={[
                    styles.rsvpChip,
                    {
                      backgroundColor: match.myRsvp === option.value ? colors.primary : colors.card,
                      borderColor: match.myRsvp === option.value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rsvpText,
                      {
                        color:
                          match.myRsvp === option.value
                            ? colors.primaryForeground
                            : colors.foreground,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Players</Text>
            <View style={styles.players}>
              {match.players.map((player) => (
                <View
                  key={player.user.id}
                  style={[
                    styles.playerRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.playerName, { color: colors.foreground }]}>
                    {player.user.firstName} {player.user.lastName}
                    {player.isHost ? ' (Host)' : ''}
                  </Text>
                  <Badge label={player.rsvp.replace(/_/g, ' ')} variant="default" />
                </View>
              ))}
            </View>

            <Button
              label="Go Live"
              fullWidth
              onPress={() => router.push(`/community/match/${matchId}/live` as Href)}
            />
          </ScrollView>
        )}
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.lg, padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  hero: { alignItems: 'center', borderRadius: Radius.xl, gap: Spacing.sm, padding: Spacing.xxl },
  emoji: { fontSize: 48 },
  title: { fontSize: FontSize.xxl, fontWeight: '900', textAlign: 'center' },
  meta: { fontSize: FontSize.sm, fontWeight: '700' },
  venue: { fontSize: FontSize.md, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '900' },
  rsvpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rsvpChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rsvpText: { fontSize: FontSize.xs, fontWeight: '800' },
  players: { gap: Spacing.sm },
  playerRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  playerName: { flex: 1, fontSize: FontSize.sm, fontWeight: '800' },
});
