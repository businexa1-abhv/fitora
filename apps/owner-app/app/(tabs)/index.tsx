import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { QueryState, Card } from '@/components/ui';
import { getOwnerDashboard } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const dashboardQuery = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => getOwnerDashboard(token!),
    enabled: !!token,
  });

  const stats = dashboardQuery.data?.stats;
  const trend = dashboardQuery.data?.monthlyTrend ?? [];
  const maxTrend = Math.max(...trend.map((t) => t.amount), 1);
  const alerts = dashboardQuery.data?.recentBookings?.slice(0, 2) ?? [];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: colors.muted }]}>Executive Overview</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Venue Performance</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.brand, { color: colors.primary }]}>FitOra Owner</Text>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text style={styles.avatarText}>
              {(user?.firstName?.[0] ?? 'O').toUpperCase()}
              {(user?.lastName?.[0] ?? '').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={[styles.chip, { backgroundColor: colors.mutedBg }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={[styles.chipText, { color: colors.primary }]}>Last 30 Days</Text>
        </View>
        <View
          style={[
            styles.chip,
            { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Ionicons name="download-outline" size={14} color={colors.primary} />
          <Text style={[styles.chipText, { color: colors.primary }]}>Export</Text>
        </View>
      </View>

      <QueryState
        isLoading={dashboardQuery.isLoading}
        isError={dashboardQuery.isError}
        error={dashboardQuery.error as Error}
        onRetry={() => dashboardQuery.refetch()}
      >
        <View style={styles.kpiGrid}>
          <KpiCard
            icon="cash-outline"
            label="Total Revenue"
            value={formatCurrency(stats?.revenueMtd ?? 0)}
            badge="+12.4%"
            badgeTone="up"
          />
          <KpiCard
            icon="people-outline"
            label="Active Members"
            value={String(stats?.activeMembers ?? 0)}
            badge="+4.1%"
            badgeTone="up"
          />
          <KpiCard
            icon="speedometer-outline"
            label="Active Courts"
            value={String(stats?.activeCourts ?? 0)}
            badge="Steady"
            badgeTone="steady"
          />
          <KpiCard
            icon="calendar-outline"
            label="Bookings MTD"
            value={String(stats?.bookingsMtd ?? 0)}
            badge={`${stats?.bookingsToday ?? 0} today`}
            badgeTone="steady"
          />
        </View>

        <Card style={{ marginTop: Spacing.lg }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Revenue Snapshot
            </Text>
            <View style={[styles.chip, { backgroundColor: colors.mutedBg }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>Monthly</Text>
            </View>
          </View>
          <View style={styles.bars}>
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
        </Card>

        <Card style={{ marginTop: Spacing.lg }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Live Occupancy</Text>
          <Text style={[styles.occupancyValue, { color: colors.primary }]}>
            {stats?.activeCourts ? Math.min(95, 40 + stats.bookingsToday * 8) : 0}%
          </Text>
          <Text style={[styles.occupancyHint, { color: colors.muted }]}>
            {stats?.bookingsToday
              ? `${stats.bookingsToday} bookings today across your courts.`
              : 'No bookings yet today.'}
          </Text>
        </Card>

        <Card style={{ marginTop: Spacing.lg }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
          <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
            {alerts.length === 0 ? (
              <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                No recent bookings yet.
              </Text>
            ) : (
              alerts.map((item) => (
                <View key={item.id} style={styles.alertRow}>
                  <View style={[styles.alertIcon, { backgroundColor: colors.mutedBg }]}>
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertTitle, { color: colors.foreground }]}>
                      {item.userName} · {item.courtName}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.xs }}>
                      {formatTime(item.time)} · {formatCurrency(item.amount)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </Card>

        <Card
          style={{
            marginTop: Spacing.lg,
            backgroundColor: colors.primaryContainer,
            borderWidth: 0,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>
            Empire tip
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: FontSize.sm }}>
            Pending courts: {stats?.pendingCourts ?? 0}. Approve inventory items to unlock more
            player bookings.
          </Text>
        </Card>
      </QueryState>
    </ScrollView>
  );
}

function KpiCard({
  icon,
  label,
  value,
  badge,
  badgeTone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  badge: string;
  badgeTone: 'up' | 'down' | 'steady';
}) {
  const { colors } = useTheme();
  const badgeBg =
    badgeTone === 'up' ? '#d1fae5' : badgeTone === 'down' ? '#fee2e2' : colors.mutedBg;
  const badgeColor =
    badgeTone === 'up' ? colors.secondary : badgeTone === 'down' ? colors.danger : colors.muted;

  return (
    <Card style={styles.kpiCard}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.kpiLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={{ color: badgeColor, fontSize: 10, fontWeight: '800' }}>{badge}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kicker: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: Spacing.sm },
  brand: { fontSize: FontSize.xs, fontWeight: '800' },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
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
  kpiCard: { flexGrow: 1, flexBasis: '45%', gap: Spacing.xs },
  kpiLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  kpiValue: { fontSize: FontSize.lg, fontWeight: '800' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: Spacing.sm,
    height: 120,
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
  occupancyValue: { fontSize: 40, fontWeight: '800', marginTop: Spacing.md },
  occupancyHint: { fontSize: FontSize.sm, marginTop: 4 },
  alertRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  alertIcon: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  alertTitle: { fontSize: FontSize.sm, fontWeight: '700' },
});
