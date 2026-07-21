import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { QueryState } from '@/components/query-state';
import { SectionHeader } from '@/components/community/section-header';
import { QuickAction } from '@/components/community/quick-action';
import { GroupCard } from '@/components/community/group-card';
import { MatchCard } from '@/components/community/match-card';
import { AnnouncementCard } from '@/components/community/announcement-card';
import { EmptyCommunity } from '@/components/community/empty-community';
import { getCommunityHome } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carousel}
    >
      {children}
    </ScrollView>
  );
}

export default function CommunityTabScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const homeQuery = useQuery({
    queryKey: ['community', 'home'],
    queryFn: () => getCommunityHome(token!),
    enabled: !!token,
  });

  const data = homeQuery.data;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View>
          <Text style={[styles.kicker, { color: colors.muted }]}>FitOra Community</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Play Together</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/community/search' as Href)}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="search" size={20} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/community/friends' as Href)}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="person-add" size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActions}
        >
          <QuickAction
            icon="add-circle"
            label="Create Group"
            onPress={() => router.push('/community/create-group' as Href)}
          />
          <QuickAction
            icon="tennisball"
            label="Find Match"
            onPress={() => router.push('/community/search' as Href)}
          />
          <QuickAction
            icon="people"
            label="Join Match"
            onPress={() => router.push('/community/feed' as Href)}
          />
          <QuickAction
            icon="megaphone"
            label="Announcement"
            onPress={() => router.push('/community/feed' as Href)}
          />
        </ScrollView>

        <QueryState
          isLoading={homeQuery.isLoading}
          isError={homeQuery.isError}
          error={homeQuery.error}
          onRetry={() => homeQuery.refetch()}
        >
          {!data ? null : (
            <>
              <Section
                title="My Groups"
                actionLabel="See all"
                onAction={() => router.push('/community/feed' as Href)}
                empty={data.myGroups.length === 0}
                emptyTitle="No groups yet"
                emptyMessage="Create or join a group to start playing with your crew."
                emptyAction="Create Group"
                onEmptyAction={() => router.push('/community/create-group' as Href)}
              >
                <HorizontalCarousel>
                  {data.myGroups.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </HorizontalCarousel>
              </Section>

              <Section title="Nearby Active Groups" empty={data.nearbyGroups.length === 0}>
                <HorizontalCarousel>
                  {data.nearbyGroups.map((group) => (
                    <GroupCard key={group.id} group={group} compact />
                  ))}
                </HorizontalCarousel>
              </Section>

              <Section title="Today's Matches" empty={data.todaysMatches.length === 0}>
                <HorizontalCarousel>
                  {data.todaysMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </HorizontalCarousel>
              </Section>

              <Section title="Upcoming Matches" empty={data.upcomingMatches.length === 0}>
                <HorizontalCarousel>
                  {data.upcomingMatches.map((match) => (
                    <MatchCard key={match.id} match={match} compact />
                  ))}
                </HorizontalCarousel>
              </Section>

              <Section title="Need Players" empty={data.needPlayers.length === 0}>
                <HorizontalCarousel>
                  {data.needPlayers.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </HorizontalCarousel>
              </Section>

              <Section title="Recent Announcements" empty={data.recentAnnouncements.length === 0}>
                <View style={styles.stack}>
                  {data.recentAnnouncements.slice(0, 3).map((item) => (
                    <AnnouncementCard
                      key={item.id}
                      announcement={item}
                      onPress={() =>
                        router.push(`/community/group/${item.groupId}/announcements` as Href)
                      }
                    />
                  ))}
                </View>
              </Section>

              <Section title="Friends Playing Now" empty={data.friendsPlayingNow.length === 0}>
                <HorizontalCarousel>
                  {data.friendsPlayingNow.map((friend) => (
                    <View
                      key={friend.id}
                      style={[
                        styles.friendCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Text style={styles.friendEmoji}>🎾</Text>
                      <Text style={[styles.friendName, { color: colors.foreground }]}>
                        {friend.firstName}
                      </Text>
                    </View>
                  ))}
                </HorizontalCarousel>
              </Section>

              <Section title="Trending Communities" empty={data.trendingCommunities.length === 0}>
                <HorizontalCarousel>
                  {data.trendingCommunities.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </HorizontalCarousel>
              </Section>

              <Section title="Suggested Groups" empty={data.suggestedGroups.length === 0}>
                <HorizontalCarousel>
                  {data.suggestedGroups.map((group) => (
                    <GroupCard key={group.id} group={group} compact />
                  ))}
                </HorizontalCarousel>
              </Section>

              <Section title="Nearby Courts" empty={data.nearbyCourts.length === 0}>
                <View style={styles.stack}>
                  {data.nearbyCourts.map((court) => (
                    <Pressable
                      key={court.id}
                      onPress={() => router.push(`/court/${court.id}` as Href)}
                      style={[
                        styles.courtRow,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <View style={[styles.courtIcon, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="location" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.courtCopy}>
                        <Text style={[styles.courtName, { color: colors.foreground }]}>
                          {court.name}
                        </Text>
                        <Text style={[styles.courtMeta, { color: colors.muted }]}>
                          {court.city}
                          {court.sportName ? ` · ${court.sportName}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </Pressable>
                  ))}
                </View>
              </Section>
            </>
          )}
        </QueryState>
      </View>
    </ScrollView>
  );
}

function Section({
  title,
  actionLabel,
  onAction,
  empty,
  emptyTitle,
  emptyMessage,
  emptyAction,
  onEmptyAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: string;
  onEmptyAction?: () => void;
  children: React.ReactNode;
}) {
  if (empty) {
    if (!emptyTitle) return null;
    return (
      <View style={styles.section}>
        <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} />
        <EmptyCommunity
          title={emptyTitle}
          message={emptyMessage ?? ''}
          actionLabel={emptyAction}
          onAction={onEmptyAction}
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  kicker: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { fontSize: FontSize.hero, fontWeight: '900', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: { gap: Spacing.xxl, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  quickActions: { gap: Spacing.md, paddingBottom: Spacing.sm },
  section: { gap: Spacing.sm },
  carousel: { gap: Spacing.md, paddingRight: Spacing.xl },
  stack: { gap: Spacing.md },
  friendCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    width: 96,
  },
  friendEmoji: { fontSize: 28 },
  friendName: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  courtRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  courtIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  courtCopy: { flex: 1 },
  courtName: { fontSize: FontSize.md, fontWeight: '900' },
  courtMeta: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
});
