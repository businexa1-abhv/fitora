import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { CoachAnalyticsScreen } from '@/components/coach-analytics';
import { Card, QueryState } from '@/components/ui';
import { getMyCourts, getOwnerDashboard } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function sportUtilFromCourts(names: string[]) {
  const buckets = [
    {
      key: 'tennis',
      label: 'Tennis',
      color: '#15157d',
      note: 'High demand: Weekends fully booked',
    },
    {
      key: 'badminton',
      label: 'Badminton',
      color: '#006c49',
      note: 'Evening slots increasing (+5%)',
    },
    {
      key: 'football',
      label: 'Football',
      color: '#5a3700',
      note: 'Available for morning leagues',
    },
  ];

  return buckets.map((sport, index) => {
    const count = names.filter((n) => n.toLowerCase().includes(sport.key)).length;
    const base = count > 0 ? Math.min(95, 55 + count * 12) : 40 + index * 15;
    return { ...sport, value: base };
  });
}

export default function PerformanceAnalyticsScreen() {
  const { isCoachMode } = useAuth();
  if (isCoachMode) return <CoachAnalyticsScreen />;
  return <OwnerAnalyticsScreen />;
}

function OwnerAnalyticsScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const dashboardQuery = useQuery({
    queryKey: ['owner', 'dashboard', 'analytics'],
    queryFn: () => getOwnerDashboard(token!, 'monthly'),
    enabled: !!token,
  });

  const courtsQuery = useQuery({
    queryKey: ['owner', 'courts'],
    queryFn: () => getMyCourts(token!),
    enabled: !!token,
  });

  const stats = dashboardQuery.data?.stats;
  const trend = dashboardQuery.data?.monthlyTrend ?? [];
  const maxTrend = Math.max(...trend.map((t) => t.amount), 1);
  const revenue = stats?.revenueMtd ?? 0;
  const members = stats?.activeMembers ?? 0;
  const courts = courtsQuery.data?.items ?? [];
  const utilization = sportUtilFromCourts(courts.map((c) => c.name));
  const avgUtil = Math.round(
    utilization.reduce((sum, item) => sum + item.value, 0) / Math.max(utilization.length, 1),
  );
  const avgPerMonth = trend.length
    ? Math.round(trend.reduce((s, t) => s + t.amount, 0) / trend.length)
    : 0;
  const peak = trend.reduce((best, item) => (item.amount > best.amount ? item : best), {
    month: '—',
    amount: 0,
  });

  const coaches = [
    {
      initials: 'MA',
      name: 'Mark Anthony',
      sport: 'TENNIS',
      students: Math.max(12, Math.round(members * 0.12)),
    },
    {
      initials: 'SL',
      name: 'Sarah Lee',
      sport: 'BADMINTON',
      students: Math.max(10, Math.round(members * 0.1)),
    },
    {
      initials: 'JD',
      name: 'John Doe',
      sport: 'FOOTBALL',
      students: Math.max(8, Math.round(members * 0.08)),
    },
  ];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="karate" size={22} color={colors.primary} />
          <Text style={[styles.brand, { color: colors.primary }]}>FitOra Academy</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
          <Text style={styles.avatarText}>
            {(user?.firstName?.[0] ?? 'D').toUpperCase()}
            {(user?.lastName?.[0] ?? '').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={[styles.kicker, { color: colors.muted }]}>PERFORMANCE OVERVIEW</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Analytics Detail</Text>

      <View style={styles.filterRow}>
        <View style={[styles.chip, { backgroundColor: colors.mutedBg }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={[styles.chipText, { color: colors.primary }]}>Last 6 Months</Text>
        </View>
        <View
          style={[
            styles.chip,
            { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Ionicons name="download-outline" size={14} color={colors.primary} />
          <Text style={[styles.chipText, { color: colors.primary }]}>Export Report</Text>
        </View>
      </View>

      <QueryState
        isLoading={dashboardQuery.isLoading}
        isError={dashboardQuery.isError}
        error={dashboardQuery.error as Error}
        onRetry={() => dashboardQuery.refetch()}
      >
        <View style={styles.kpiGrid}>
          <Kpi
            icon="cash-outline"
            label="Membership Rev."
            value={formatCurrency(revenue)}
            badge="+12%"
            tone="up"
          />
          <Kpi
            icon="people-outline"
            label="Active Students"
            value={String(members)}
            badge={`+${Math.max(1, Math.round(members * 0.08))}`}
            tone="up"
          />
          <Kpi
            icon="barbell-outline"
            label="Active Coaches"
            value={String(Math.max(1, coaches.length))}
            badge="Stable"
            tone="steady"
          />
          <Kpi
            icon="speedometer-outline"
            label="Avg. Utilization"
            value={`${avgUtil}%`}
            badge="-2%"
            tone="down"
          />
        </View>

        <Card style={{ marginTop: Spacing.lg }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Revenue Trends</Text>
            <View style={styles.legend}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={{ color: colors.muted, fontSize: FontSize.xs, fontWeight: '700' }}>
                Subscriptions
              </Text>
            </View>
          </View>

          <View style={styles.chart}>
            {(trend.length ? trend : [{ month: '—', amount: 0 }]).map((item) => (
              <View key={item.month} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: colors.primaryContainer,
                        height: `${Math.max(8, (item.amount / maxTrend) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.muted }]}>{item.month}</Text>
              </View>
            ))}
          </View>

          <View style={styles.trendStats}>
            <TrendStat label="Monthly Average" value={formatCurrency(avgPerMonth)} />
            <TrendStat
              label="Peak Month"
              value={`${peak.month} (${formatCurrency(peak.amount)})`}
            />
            <TrendStat label="Projected" value={formatCurrency(Math.round(avgPerMonth * 1.1))} />
          </View>
        </Card>

        <Card style={{ marginTop: Spacing.lg }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Capacity Utilization
          </Text>
          <View style={{ marginTop: Spacing.lg, gap: Spacing.lg }}>
            {utilization.map((sport) => (
              <View key={sport.label}>
                <View style={styles.utilHeader}>
                  <Text style={[styles.utilLabel, { color: colors.foreground }]}>
                    {sport.label}
                  </Text>
                  <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                    {sport.value}%
                  </Text>
                </View>
                <View style={[styles.utilTrack, { backgroundColor: colors.mutedBg }]}>
                  <View
                    style={[
                      styles.utilFill,
                      { backgroundColor: sport.color, width: `${sport.value}%` },
                    ]}
                  />
                </View>
                <Text style={{ color: colors.muted, fontSize: FontSize.xs, marginTop: 4 }}>
                  {sport.note}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.coachLoad, { backgroundColor: colors.mutedBg }]}>
            <Ionicons name="people" size={18} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontWeight: '800' }}>
              Avg. {(members / Math.max(coaches.length, 1)).toFixed(1)} Students/Coach
            </Text>
          </View>
        </Card>

        <Card style={{ marginTop: Spacing.lg }}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Active Coaching Staff
              </Text>
              <Text style={{ color: colors.muted, fontSize: FontSize.xs, marginTop: 2 }}>
                Efficiency and Student Satisfaction
              </Text>
            </View>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}>
              View All
            </Text>
          </View>

          <View style={[styles.tableHead, { borderBottomColor: colors.border }]}>
            <Text style={[styles.th, { flex: 1.4 }]}>COACH</Text>
            <Text style={[styles.th, { flex: 1 }]}>SPORT</Text>
            <Text style={[styles.th, { width: 70, textAlign: 'right' }]}>STUDENTS</Text>
          </View>
          {coaches.map((coach) => (
            <View key={coach.name} style={styles.tableRow}>
              <View style={[styles.coachCell, { flex: 1.4 }]}>
                <View style={[styles.coachAvatar, { backgroundColor: colors.primaryContainer }]}>
                  <Text style={styles.coachInitials}>{coach.initials}</Text>
                </View>
                <Text style={[styles.coachName, { color: colors.foreground }]} numberOfLines={1}>
                  {coach.name}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={[styles.sportPill, { backgroundColor: colors.secondaryContainer }]}>
                  <Text style={{ color: colors.secondary, fontSize: 10, fontWeight: '800' }}>
                    {coach.sport}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: colors.foreground,
                  fontWeight: '800',
                  textAlign: 'right',
                  width: 70,
                }}
              >
                {coach.students}
              </Text>
            </View>
          ))}
        </Card>
      </QueryState>
    </ScrollView>
  );
}

function Kpi({
  icon,
  label,
  value,
  badge,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  badge: string;
  tone: 'up' | 'down' | 'steady';
}) {
  const { colors } = useTheme();
  const badgeBg = tone === 'up' ? '#d1fae5' : tone === 'down' ? '#fee2e2' : colors.mutedBg;
  const badgeColor =
    tone === 'up' ? colors.secondary : tone === 'down' ? colors.danger : colors.muted;

  return (
    <Card style={styles.kpiCard}>
      <View style={styles.kpiTop}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={{ color: badgeColor, fontSize: 10, fontWeight: '800' }}>{badge}</Text>
        </View>
      </View>
      <Text style={[styles.kpiLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </Card>
  );
}

function TrendStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text
        style={{ color: colors.foreground, fontSize: FontSize.sm, fontWeight: '800', marginTop: 2 }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: Spacing.xl,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  chip: {
    alignItems: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: { fontSize: FontSize.xs, fontWeight: '700' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  kpiCard: { flexBasis: '46%', flexGrow: 1, gap: 4 },
  kpiTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kpiLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  kpiValue: { fontSize: FontSize.lg, fontWeight: '800' },
  badge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  legend: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: Spacing.sm,
    height: 140,
    marginTop: Spacing.lg,
  },
  barCol: { alignItems: 'center', flex: 1, height: '100%' },
  barTrack: {
    backgroundColor: '#f0f3ff',
    borderRadius: Radius.sm,
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  barFill: { borderRadius: Radius.sm, width: '100%' },
  barLabel: { fontSize: 9, fontWeight: '700', marginTop: 4 },
  trendStats: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  utilHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  utilLabel: { fontSize: FontSize.sm, fontWeight: '800' },
  utilTrack: { borderRadius: Radius.full, height: 10, overflow: 'hidden' },
  utilFill: { borderRadius: Radius.full, height: '100%' },
  coachLoad: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    padding: Spacing.md,
  },
  tableHead: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  th: { color: '#777683', fontSize: 10, fontWeight: '800' },
  tableRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: Spacing.md,
  },
  coachCell: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  coachAvatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  coachInitials: { color: '#fff', fontSize: 10, fontWeight: '800' },
  coachName: { flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  sportPill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
