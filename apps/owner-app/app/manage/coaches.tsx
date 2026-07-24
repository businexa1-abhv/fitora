import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { getTenantMe, listTenantTrainers } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CoachDirectoryScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const tenantQuery = useQuery({
    queryKey: ['owner', 'tenant'],
    queryFn: () => getTenantMe(token!),
    enabled: !!token,
  });

  const trainersQuery = useQuery({
    queryKey: ['owner', 'trainers', tenantQuery.data?.id],
    queryFn: () => listTenantTrainers(token!, tenantQuery.data!.id),
    enabled: !!token && !!tenantQuery.data?.id,
  });

  const coaches = useMemo(() => {
    const rows = trainersQuery.data ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((t) =>
      `${t.firstName ?? ''} ${t.lastName ?? ''} ${t.email}`.toLowerCase().includes(q),
    );
  }, [trainersQuery.data, search]);

  const avgRating = useMemo(() => {
    const ratings = (trainersQuery.data ?? [])
      .map((t) => {
        const r = t.trainerProfile?.averageRating;
        return r != null ? Number(r) : null;
      })
      .filter((r): r is number => r != null && r > 0);
    if (!ratings.length) return '—';
    return (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1);
  }, [trainersQuery.data]);

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
      <Text style={[styles.title, { color: colors.foreground }]}>Coach Directory</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Manage your academy&apos;s athletic staff and schedules.
      </Text>

      <View style={styles.stats}>
        <Stat label="Total Coaches" value={String(coaches.length)} colors={colors} />
        <Stat label="Avg Rating" value={`★ ${avgRating}`} colors={colors} />
      </View>

      <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search coaches"
          placeholderTextColor={colors.muted}
          style={{ flex: 1, color: colors.foreground, paddingVertical: Spacing.sm }}
        />
      </View>

      <QueryState
        isLoading={tenantQuery.isLoading || trainersQuery.isLoading}
        isError={trainersQuery.isError}
        error={trainersQuery.error as Error}
        onRetry={() => trainersQuery.refetch()}
        empty={coaches.length === 0}
      >
        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          {coaches.map((coach) => {
            const name = `${coach.firstName ?? ''} ${coach.lastName ?? ''}`.trim() || coach.email;
            const spec = coach.trainerProfile?.specializations?.[0] ?? 'Coach';
            const rating = coach.trainerProfile?.averageRating
              ? Number(coach.trainerProfile.averageRating).toFixed(1)
              : '—';
            return (
              <Pressable key={coach.id} onPress={() => router.push(`/manage/coach/${coach.id}`)}>
                <Card style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>{name}</Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {spec} · ★ {rating}
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

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { card: string; border: string; muted: string; foreground: string };
}) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.lg }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  stat: { borderRadius: Radius.lg, borderWidth: 1, flex: 1, gap: 2, padding: Spacing.md },
  search: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, padding: Spacing.md },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { color: '#fff', fontWeight: '800' },
});
