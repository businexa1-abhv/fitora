import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { getMyCourts, getOwnerDashboard } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const SPORT_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  badminton: 'badminton',
  tennis: 'tennis',
  cricket: 'cricket',
  football: 'soccer',
  swimming: 'swim',
  gym: 'dumbbell',
};

export default function GamesServicesOverviewScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const courtsQuery = useQuery({
    queryKey: ['owner', 'courts'],
    queryFn: () => getMyCourts(token!),
    enabled: !!token,
  });

  const dashboardQuery = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => getOwnerDashboard(token!),
    enabled: !!token,
  });

  const courts = courtsQuery.data?.items ?? [];
  const bySport = new Map<string, typeof courts>();
  for (const court of courts) {
    const key = court.sport?.slug ?? 'other';
    const list = bySport.get(key) ?? [];
    list.push(court);
    bySport.set(key, list);
  }

  const sportCards = Array.from(bySport.entries()).map(([slug, items]) => ({
    slug,
    name: items[0]?.sport?.name ?? slug,
    count: items.length,
    active: items.filter((c) => c.isActive && c.approvalStatus === 'APPROVED').length,
    courtId: items[0]?.id,
  }));

  const members = dashboardQuery.data?.stats.activeMembers ?? 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.brand, { color: colors.primary }]}>FitOra Academy</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>Games Overview</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Manage sports, courts, and academy programs.
      </Text>

      <View style={styles.filters}>
        {['All Sports', 'Outdoor', 'Indoor'].map((label, i) => (
          <View
            key={label}
            style={[
              styles.filterChip,
              {
                backgroundColor: i === 0 ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{ color: i === 0 ? '#fff' : colors.foreground, fontWeight: '700' }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <QueryState
        isLoading={courtsQuery.isLoading}
        isError={courtsQuery.isError}
        error={courtsQuery.error as Error}
        onRetry={() => courtsQuery.refetch()}
        empty={sportCards.length === 0}
      >
        <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
          {sportCards.map((sport) => (
            <Card key={sport.slug} style={styles.sportCard}>
              <View style={[styles.sportIcon, { backgroundColor: colors.surfaceContainer }]}>
                <MaterialCommunityIcons
                  name={SPORT_ICONS[sport.slug] ?? 'stadium'}
                  size={28}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.lg }}
                >
                  {sport.name}
                </Text>
                <Text style={{ color: colors.muted, marginTop: 2 }}>
                  {sport.active} Active Courts · {sport.count} total
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  router.push(
                    sport.courtId ? `/ops/pricing?courtId=${sport.courtId}` : '/(tabs)/courts',
                  )
                }
                style={[styles.manageBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm }}>
                  Manage
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </Pressable>
            </Card>
          ))}
        </View>
      </QueryState>

      <Card style={[styles.insight, { backgroundColor: colors.primary, marginTop: Spacing.xl }]}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.lg }}>
          Active Enrollments
        </Text>
        <Text style={{ color: '#fff', fontSize: FontSize.hero, fontWeight: '800', marginTop: 4 }}>
          {members.toLocaleString()}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
          Members across your academy programs.
        </Text>
        <Pressable style={styles.insightBtn} onPress={() => router.push('/ops/memberships')}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>New Enrollment</Text>
        </Pressable>
      </Card>

      <View style={styles.quickLinks}>
        {[
          { label: 'Memberships', href: '/ops/memberships', icon: 'card-outline' as const },
          { label: 'Hours', href: '/ops/hours', icon: 'time-outline' as const },
          { label: 'Calendar', href: '/ops/calendar', icon: 'calendar-outline' as const },
          { label: 'Walk-in', href: '/ops/walk-in', icon: 'walk-outline' as const },
        ].map((item) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.href as never)}
            style={[styles.quickLink, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name={item.icon} size={18} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: FontSize.sm }}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  filterChip: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sportCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  sportIcon: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  manageBtn: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  insight: { borderRadius: Radius.lg, gap: 2, padding: Spacing.lg },
  insightBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  quickLink: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    padding: Spacing.md,
  },
});
