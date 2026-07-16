import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { CoachDashboardScreen } from '@/components/coach-dashboard';
import { Card, QueryState } from '@/components/ui';
import {
  getMyCourts,
  getOwnerBookings,
  getOwnerDashboard,
  getTenantMe,
  getUnreadNotificationCount,
  listTenantTrainers,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useOwnerCalendarLive } from '@/hooks/use-owner-calendar-live';

function formatSlotTime(iso?: string) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatCompactMoney(amount: number) {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return formatCurrency(amount);
}

export default function DashboardScreen() {
  const { isOwner, isTrainer } = useAuth();
  const isCoachOnly = isTrainer && !isOwner;
  if (isCoachOnly) return <CoachDashboardScreen />;
  return <AcademyDashboardScreen />;
}

function AcademyDashboardScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const dashboardQuery = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: () => getOwnerDashboard(token!),
    enabled: !!token,
  });

  const bookingsQuery = useQuery({
    queryKey: ['owner', 'bookings', 'today'],
    queryFn: () => getOwnerBookings(token!),
    enabled: !!token,
  });

  const courtsQuery = useQuery({
    queryKey: ['owner', 'courts'],
    queryFn: () => getMyCourts(token!),
    enabled: !!token,
  });

  const unreadQuery = useQuery({
    queryKey: ['owner', 'notifications', 'unread'],
    queryFn: () => getUnreadNotificationCount(token!),
    enabled: !!token,
  });

  const stats = dashboardQuery.data?.stats;
  const revenue = stats?.revenueMtd ?? 0;
  const members = stats?.activeMembers ?? 0;
  const activeCourts = stats?.activeCourts ?? 0;
  const pendingCourts = stats?.pendingCourts ?? 0;
  const bookingsToday = stats?.bookingsToday ?? 0;
  const bookingsMtd = stats?.bookingsMtd ?? 0;
  const totalCourts = courtsQuery.data?.items?.length ?? stats?.activeCourts ?? 0;
  const occupancy =
    totalCourts > 0 ? Math.min(98, Math.round((activeCourts / Math.max(totalCourts, 1)) * 100)) : 0;

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

  const coachCount = trainersQuery.data?.length ?? 0;
  const revenueBreakdown = dashboardQuery.data?.revenueBreakdown ?? [];
  const trend = dashboardQuery.data?.monthlyTrend ?? [];
  const growthPct =
    trend.length >= 2
      ? Math.round(
          ((trend[trend.length - 1]!.amount - trend[trend.length - 2]!.amount) /
            Math.max(1, trend[trend.length - 2]!.amount)) *
            100,
        )
      : 12;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaysBookings = (bookingsQuery.data?.items ?? [])
    .filter((b) => {
      const start = b.slot?.startTime ? new Date(b.slot.startTime).getTime() : 0;
      return start >= todayStart.getTime() && start <= todayEnd.getTime();
    })
    .slice(0, 5);

  const fallbackBookings = (dashboardQuery.data?.recentBookings ?? []).slice(0, 5);
  const bookingRows =
    todaysBookings.length > 0
      ? todaysBookings.map((b) => ({
          id: b.id,
          time: formatSlotTime(b.slot?.startTime),
          court: b.court?.name ?? 'Court',
          player: `${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim() || 'Player',
          status: b.status,
        }))
      : fallbackBookings.map((b) => ({
          id: b.id,
          time: formatSlotTime(b.time),
          court: b.courtName,
          player: b.userName,
          status: b.status,
        }));

  const facilities = (courtsQuery.data?.items ?? []).slice(0, 4);
  const liveCourtId = courtsQuery.data?.items?.[0]?.id;
  useOwnerCalendarLive(liveCourtId, token);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="karate" size={22} color={colors.primary} />
            <Text style={[styles.brand, { color: colors.primary }]}>FitOra Academy</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable onPress={() => router.push('/(tabs)/notifications')} style={styles.bellWrap}>
              <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
              {(unreadQuery.data?.count ?? 0) > 0 && (
                <View style={[styles.dot, { backgroundColor: colors.danger }]} />
              )}
            </Pressable>
            <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
              <Text style={styles.avatarText}>
                {(user?.firstName?.[0] ?? 'D').toUpperCase()}
                {(user?.lastName?.[0] ?? '').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.overview, { color: colors.foreground }]}>Executive Overview</Text>
        <Text style={[styles.welcome, { color: colors.muted }]}>
          Welcome back, {user?.firstName || 'Director'}. Academy performance and venue ops in one
          snapshot.
        </Text>

        <QueryState
          isLoading={dashboardQuery.isLoading}
          isError={dashboardQuery.isError}
          error={dashboardQuery.error as Error}
          onRetry={() => dashboardQuery.refetch()}
        >
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>TOTAL REVENUE</Text>
              <View style={styles.trendPill}>
                <Ionicons name="trending-up" size={12} color={colors.secondary} />
                <Text style={{ color: colors.secondary, fontSize: 11, fontWeight: '800' }}>
                  {growthPct >= 0 ? '+' : ''}
                  {growthPct}%
                </Text>
              </View>
            </View>
            <Text style={[styles.metricValue, { color: colors.foreground }]}>
              {formatCompactMoney(revenue)}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.mutedBg }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.min(100, Math.max(12, Math.abs(growthPct) + 40))}%`,
                  },
                ]}
              />
            </View>
          </Card>

          <View style={styles.execRow}>
            <Card style={[styles.execCard, { flex: 1 }]}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>BOOKINGS TODAY</Text>
              <Text style={[styles.execValue, { color: colors.foreground }]}>{bookingsToday}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>{bookingsMtd} MTD</Text>
            </Card>
            <Card style={[styles.execCard, { flex: 1 }]}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>MEMBERSHIP</Text>
              <Text style={[styles.execValue, { color: colors.foreground }]}>{members}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>Active members</Text>
            </Card>
          </View>

          <View style={styles.execRow}>
            <Card style={[styles.execCard, { flex: 1 }]}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>COACH STATUS</Text>
              <Text style={[styles.execValue, { color: colors.foreground }]}>{coachCount}</Text>
              <Pressable onPress={() => router.push('/manage/coaches')}>
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                  View coaches
                </Text>
              </Pressable>
            </Card>
            <Card style={[styles.execCard, { flex: 1 }]}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>PENDING APPROVALS</Text>
              <Text style={[styles.execValue, { color: colors.foreground }]}>{pendingCourts}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>Courts awaiting review</Text>
            </Card>
          </View>

          {revenueBreakdown.length > 0 ? (
            <Card style={styles.metricCard}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>REVENUE MIX</Text>
              <View style={{ marginTop: Spacing.sm, gap: 6 }}>
                {revenueBreakdown.slice(0, 3).map((row) => (
                  <View key={row.source} style={styles.mixRow}>
                    <Text style={{ color: colors.foreground, flex: 1, fontSize: FontSize.sm }}>
                      {row.source}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {Math.round(row.share)}%
                    </Text>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: '800',
                        minWidth: 64,
                        textAlign: 'right',
                      }}
                    >
                      {formatCompactMoney(row.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>OCCUPANCY RATE</Text>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>
                Target: 85%
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.foreground }]}>{occupancy}%</Text>
            <View style={styles.segmentRow}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        occupancy > i * 25 ? colors.secondaryContainer : colors.mutedBg,
                    },
                  ]}
                />
              ))}
            </View>
          </Card>

          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>ACTIVE PLAYERS</Text>
              <Ionicons name="people-outline" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.metricValue, { color: colors.foreground }]}>
              {members.toLocaleString('en-IN')}
            </Text>
            <Text style={{ color: colors.muted, fontSize: FontSize.sm, marginTop: 4 }}>
              {bookingsMtd} bookings this period · Growth {growthPct >= 0 ? '+' : ''}
              {growthPct}%
            </Text>
          </Card>

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryAction, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/ops/walk-in')}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <View>
                <Text style={styles.primaryActionTitle}>Add Booking</Text>
                <Text style={styles.primaryActionSub}>Walk-in / reserve</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.secondaryAction, { backgroundColor: colors.secondaryContainer }]}
              onPress={() => router.push('/ops/check-in')}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.secondary} />
              <Text style={[styles.secondaryActionTitle, { color: colors.secondary }]}>
                Check-in
              </Text>
            </Pressable>
            <Pressable
              style={[styles.billingAction, { backgroundColor: colors.mutedBg }]}
              onPress={() => router.push('/(tabs)/analytics')}
            >
              <Ionicons name="card-outline" size={18} color={colors.primary} />
              <Text style={[styles.billingText, { color: colors.primary }]}>Billing</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Today&apos;s Bookings
            </Text>
            <Pressable onPress={() => router.push('/ops/calendar')}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}>
                View All
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: Spacing.sm }}>
            {bookingRows.length === 0 ? (
              <Card>
                <Text style={{ color: colors.muted }}>No bookings scheduled for today.</Text>
              </Card>
            ) : (
              bookingRows.map((row) => (
                <Card key={row.id} style={styles.bookingRow}>
                  <View style={[styles.timeBox, { backgroundColor: colors.mutedBg }]}>
                    <Text style={[styles.timeText, { color: colors.primary }]}>{row.time}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.bookingCourt, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {row.court}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }} numberOfLines={1}>
                      {row.player} · {row.status}
                    </Text>
                  </View>
                  <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
                </Card>
              ))
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: Spacing.xl }]}>
            Top Players
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/analytics')}
            style={[styles.growthCard, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.growthTitle}>Growth Pulse</Text>
            <Text style={styles.growthBody}>
              Player acquisition trending with {members} active members on your roster.
            </Text>
            <View style={styles.growthBtn}>
              <Text style={styles.growthBtnText}>See Demographics</Text>
            </View>
          </Pressable>

          <Card style={{ marginTop: Spacing.lg }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Facility Status</Text>
            <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
              {facilities.length === 0 ? (
                <Text style={{ color: colors.muted }}>No courts yet.</Text>
              ) : (
                facilities.map((court) => {
                  const open = court.isActive && court.approvalStatus === 'APPROVED';
                  return (
                    <Pressable
                      key={court.id}
                      style={styles.facilityRow}
                      onPress={() => router.push(`/court/${court.id}`)}
                    >
                      <Text
                        style={[styles.facilityName, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {court.name}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: open ? '#d1fae5' : '#ffedd5' },
                        ]}
                      >
                        <Text
                          style={{
                            color: open ? colors.secondary : colors.tertiary,
                            fontSize: 10,
                            fontWeight: '800',
                          }}
                        >
                          {open
                            ? 'Open'
                            : court.approvalStatus === 'PENDING'
                              ? 'Pending'
                              : 'Maint.'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </Card>
        </QueryState>
      </ScrollView>

      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 72,
          },
        ]}
        onPress={() => router.push('/court/form')}
      >
        <Ionicons name="create-outline" size={22} color="#fff" />
      </Pressable>
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
  topActions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  bellWrap: { position: 'relative' },
  dot: {
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 8,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
  overview: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.xl },
  welcome: { fontSize: FontSize.sm, marginTop: 4 },
  metricCard: { gap: Spacing.sm, marginTop: Spacing.md },
  metricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  metricValue: { fontSize: 36, fontWeight: '800' },
  execRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  execCard: { gap: 4, padding: Spacing.md },
  execValue: { fontSize: FontSize.xxl, fontWeight: '800' },
  mixRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  trendPill: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  progressTrack: { borderRadius: Radius.full, height: 8, overflow: 'hidden' },
  progressFill: { borderRadius: Radius.full, height: '100%' },
  segmentRow: { flexDirection: 'row', gap: 6 },
  segment: { borderRadius: 4, flex: 1, height: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  primaryAction: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    flexGrow: 1,
    gap: Spacing.sm,
    minWidth: '58%',
    padding: Spacing.md,
  },
  primaryActionTitle: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  primaryActionSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  secondaryAction: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    flexGrow: 1,
    gap: Spacing.sm,
    minWidth: '30%',
    padding: Spacing.md,
  },
  secondaryActionTitle: { fontSize: FontSize.sm, fontWeight: '800' },
  billingAction: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  billingText: { fontSize: FontSize.sm, fontWeight: '800' },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  bookingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  timeBox: {
    borderRadius: Radius.md,
    minWidth: 72,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  timeText: { fontSize: FontSize.xs, fontWeight: '800', textAlign: 'center' },
  bookingCourt: { fontSize: FontSize.md, fontWeight: '800' },
  growthCard: { borderRadius: Radius.lg, marginTop: Spacing.md, padding: Spacing.xl },
  growthTitle: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
  growthBody: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, marginTop: Spacing.sm },
  growthBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.xl,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  growthBtnText: { color: '#fff', fontWeight: '800' },
  facilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  facilityName: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', marginRight: Spacing.md },
  statusPill: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  fab: {
    alignItems: 'center',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
  },
});
