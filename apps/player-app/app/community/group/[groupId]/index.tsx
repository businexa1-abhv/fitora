import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  COMMUNITY_GROUP_TYPE_LABELS,
  COMMUNITY_SKILL_LABELS,
  CommunityMemberRole,
  CommunityMemberStatus,
} from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchCard } from '@/components/community/match-card';
import { getGroup, joinGroup, leaveGroup } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const groupQuery = useQuery({
    queryKey: ['community', 'group', groupId],
    queryFn: () => getGroup(token!, groupId!),
    enabled: !!token && !!groupId,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinGroup(token!, groupId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'group', groupId] }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(token!, groupId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'group', groupId] }),
  });

  const group = groupQuery.data;
  const isMember = group?.myStatus === CommunityMemberStatus.ACTIVE;
  const isAdmin =
    group?.myRole === CommunityMemberRole.ADMIN ||
    group?.myRole === CommunityMemberRole.OWNER ||
    group?.myRole === CommunityMemberRole.CO_ADMIN;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={group?.name ?? 'Group'} showBack />
      <QueryState
        isLoading={groupQuery.isLoading}
        isError={groupQuery.isError}
        error={groupQuery.error}
        onRetry={() => groupQuery.refetch()}
      >
        {!group ? null : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.hero, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.heroEmoji}>{group.emoji ?? '🏸'}</Text>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>{group.name}</Text>
              <Text style={[styles.heroMeta, { color: colors.muted }]}>
                {COMMUNITY_GROUP_TYPE_LABELS[group.groupType]} · {group.memberCount} members
              </Text>
              <Badge label={COMMUNITY_SKILL_LABELS[group.skillLevel]} variant="primary" />
            </View>

            {group.description ? (
              <Text style={[styles.description, { color: colors.muted }]}>{group.description}</Text>
            ) : null}

            {group.upcomingMatch ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Upcoming Match
                </Text>
                <MatchCard match={group.upcomingMatch} />
              </View>
            ) : null}

            <View style={styles.linkGrid}>
              <LinkTile
                icon="chatbubbles"
                label="Chat"
                onPress={() => router.push(`/community/group/${groupId}/chat` as Href)}
              />
              <LinkTile
                icon="people"
                label="Members"
                onPress={() => router.push(`/community/group/${groupId}/members` as Href)}
              />
              <LinkTile
                icon="megaphone"
                label="Announce"
                onPress={() => router.push(`/community/group/${groupId}/announcements` as Href)}
              />
              <LinkTile
                icon="images"
                label="Media"
                onPress={() => router.push(`/community/group/${groupId}/media` as Href)}
              />
              <LinkTile
                icon="bar-chart"
                label="Polls"
                onPress={() => router.push(`/community/group/${groupId}/polls` as Href)}
              />
              <LinkTile
                icon="trophy"
                label="Leaderboard"
                onPress={() => router.push(`/community/group/${groupId}/leaderboard` as Href)}
              />
            </View>

            <View style={styles.actions}>
              {isMember ? (
                <>
                  <Button
                    label="Open Chat"
                    fullWidth
                    onPress={() => router.push(`/community/group/${groupId}/chat` as Href)}
                  />
                  {isAdmin ? (
                    <Button
                      label="Admin Panel"
                      variant="secondary"
                      fullWidth
                      onPress={() => router.push(`/community/group/${groupId}/admin` as Href)}
                    />
                  ) : null}
                  <Button
                    label={leaveMutation.isPending ? 'Leaving...' : 'Leave Group'}
                    variant="outline"
                    fullWidth
                    disabled={leaveMutation.isPending}
                    onPress={() => leaveMutation.mutate()}
                  />
                </>
              ) : (
                <Button
                  label={joinMutation.isPending ? 'Joining...' : 'Join Group'}
                  fullWidth
                  disabled={joinMutation.isPending}
                  onPress={() => joinMutation.mutate()}
                />
              )}
            </View>
          </ScrollView>
        )}
      </QueryState>
    </View>
  );
}

function LinkTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.linkTile, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.linkLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.lg, padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  hero: { alignItems: 'center', borderRadius: Radius.xl, gap: Spacing.sm, padding: Spacing.xxl },
  heroEmoji: { fontSize: 56 },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '900', textAlign: 'center' },
  heroMeta: { fontSize: FontSize.sm, fontWeight: '700' },
  description: { fontSize: FontSize.md, lineHeight: 22 },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '900' },
  linkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  linkTile: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
    padding: Spacing.md,
    width: '31%',
  },
  linkLabel: { fontSize: FontSize.xs, fontWeight: '800', textAlign: 'center' },
  actions: { gap: Spacing.md, marginTop: Spacing.md },
});
