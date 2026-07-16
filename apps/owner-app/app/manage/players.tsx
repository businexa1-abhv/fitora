import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { listCrmPlayers } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function PlayerDirectoryScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['owner', 'crm', 'players', search],
    queryFn: () => listCrmPlayers(token!, search.trim() || undefined),
    enabled: !!token,
  });

  const players = query.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="FitOra Academy" />
      <Text style={[styles.title, { color: colors.foreground }]}>Player Directory</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Manage and view all registered academy athletes.
      </Text>

      <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search players"
          placeholderTextColor={colors.muted}
          style={{ flex: 1, color: colors.foreground }}
        />
      </View>

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
        empty={players.length === 0}
      >
        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          {players.map((p) => {
            const name = `${p.firstName} ${p.lastName}`.trim() || p.email;
            return (
              <Pressable
                key={p.userId}
                onPress={() =>
                  router.push({
                    pathname: '/manage/player/[id]',
                    params: { id: p.userId },
                  })
                }
              >
                <Card style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>{name}</Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {(p.courtNames ?? []).slice(0, 2).join(' · ') || 'Member'} · {p.bookingCount}{' '}
                      bookings
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                    <Text style={{ color: colors.secondary, fontWeight: '800', fontSize: 10 }}>
                      ACTIVE
                    </Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.sm },
  search: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.lg },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
});
