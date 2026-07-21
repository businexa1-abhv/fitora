import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { GroupCard } from '@/components/community/group-card';
import { EmptyCommunity } from '@/components/community/empty-community';
import { searchCommunity } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CommunitySearchScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const searchQuery = useQuery({
    queryKey: ['community', 'search', query],
    queryFn: () => searchCommunity(token!, query.trim()),
    enabled: !!token && query.trim().length >= 2,
  });

  const results = searchQuery.data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Search Community" showBack />
      <View style={styles.content}>
        <View
          style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <TextInput
            autoCapitalize="none"
            autoFocus
            onChangeText={setQuery}
            placeholder="Groups, players, venues, sports..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            value={query}
          />
        </View>

        <QueryState
          isLoading={searchQuery.isLoading}
          isError={searchQuery.isError}
          error={searchQuery.error}
          onRetry={() => searchQuery.refetch()}
        >
          {!results ? (
            query.trim().length < 2 ? (
              <EmptyCommunity
                emoji="🔍"
                title="Search the community"
                message="Find groups, players, venues, and sports near you."
              />
            ) : null
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.results}>
              <ResultSection title="Groups" empty={results.groups.length === 0}>
                <View style={styles.groupGrid}>
                  {results.groups.map((group) => (
                    <GroupCard key={group.id} group={group} compact />
                  ))}
                </View>
              </ResultSection>

              <ResultSection title="Players" empty={results.players.length === 0}>
                {results.players.map((player) => (
                  <View
                    key={player.id}
                    style={[
                      styles.playerRow,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={styles.playerEmoji}>🎾</Text>
                    <Text style={[styles.playerName, { color: colors.foreground }]}>
                      {player.firstName} {player.lastName}
                    </Text>
                  </View>
                ))}
              </ResultSection>

              <ResultSection title="Venues" empty={results.venues.length === 0}>
                {results.venues.map((venue) => (
                  <View
                    key={venue.id}
                    style={[
                      styles.playerRow,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.playerName, { color: colors.foreground }]}>
                      {venue.name}
                    </Text>
                    <Text style={[styles.playerMeta, { color: colors.muted }]}>{venue.city}</Text>
                  </View>
                ))}
              </ResultSection>

              <ResultSection title="Sports" empty={results.sports.length === 0}>
                {results.sports.map((sport) => (
                  <View
                    key={sport.id}
                    style={[
                      styles.playerRow,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.playerName, { color: colors.foreground }]}>
                      {sport.name}
                    </Text>
                  </View>
                ))}
              </ResultSection>

              <ResultSection title="Friends" empty={results.friends.length === 0}>
                {results.friends.map((friend) => (
                  <View
                    key={friend.id}
                    style={[
                      styles.playerRow,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.playerName, { color: colors.foreground }]}>
                      {friend.firstName} {friend.lastName}
                    </Text>
                  </View>
                ))}
              </ResultSection>
            </ScrollView>
          )}
        </QueryState>
      </View>
    </View>
  );
}

function ResultSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  if (empty) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, gap: Spacing.lg, paddingHorizontal: Spacing.xl },
  searchBox: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInput: { fontSize: FontSize.md, fontWeight: '600' },
  results: { gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '900' },
  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  playerRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  playerEmoji: { fontSize: 22 },
  playerName: { flex: 1, fontSize: FontSize.md, fontWeight: '800' },
  playerMeta: { fontSize: FontSize.xs, fontWeight: '600' },
});
