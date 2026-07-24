import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { CoachHeader } from '@/components/coach-header';
import { QueryState } from '@/components/ui';
import { getTrainerDashboard, getTrainerSchedule } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function MiniBars({ activeIndex = 6 }: { activeIndex?: number }) {
  const heights = [28, 40, 34, 48, 36, 44, 52];
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  return (
    <View style={styles.chartRow}>
      {heights.map((h, i) => (
        <View key={days[i]} style={styles.chartCol}>
          <View
            style={[
              styles.chartBar,
              {
                height: h,
                backgroundColor:
                  i === activeIndex ? CoachColors.chartBarActive : CoachColors.chartBar,
              },
            ]}
          />
          <Text style={styles.chartLabel}>{days[i]}</Text>
        </View>
      ))}
    </View>
  );
}

export function CoachDashboardScreen() {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const dashboardQuery = useQuery({
    queryKey: ['trainer', 'dashboard'],
    queryFn: () => getTrainerDashboard(token!),
    enabled: !!token,
  });

  const scheduleQuery = useQuery({
    queryKey: ['trainer', 'schedule'],
    queryFn: async () => (await getTrainerSchedule(token!)).items,
    enabled: !!token,
  });

  const dashboard = dashboardQuery.data;
  const sessionsToday = scheduleQuery.data?.length ?? 0;
  const attendancePct =
    dashboard && dashboard.activeStudents > 0
      ? Math.round(
          ((dashboard.attendanceMarkedToday || 0) / Math.max(dashboard.activeStudents, 1)) * 100,
        )
      : 0;

  return (
    <View style={[styles.root, { backgroundColor: CoachColors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <CoachHeader />

        <View style={styles.badge}>
          <Text style={styles.badgeText}>TRAINING</Text>
        </View>
        <Text style={styles.headline}>
          {greetingForNow()}, Coach {user?.firstName || 'Marcus'}
        </Text>
        <Text style={styles.subhead}>
          You have {sessionsToday} session{sessionsToday === 1 ? '' : 's'} scheduled for today.
        </Text>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push('/coach/training-plan' as never)}
          >
            <MaterialCommunityIcons name="bullhorn-outline" size={18} color="#fff" />
            <Text style={styles.actionText}>New Announcement</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/coach/notes' as never)}>
            <Ionicons name="clipboard-outline" size={18} color="#fff" />
            <Text style={styles.actionText}>Log Training</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push('/coach/performance' as never)}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#fff" />
            <Text style={styles.actionText}>My Performance</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push('/coach/edit-profile' as never)}
          >
            <Ionicons name="person-outline" size={18} color="#fff" />
            <Text style={styles.actionText}>Edit Profile</Text>
          </Pressable>
        </View>

        <QueryState
          isLoading={dashboardQuery.isLoading}
          isError={dashboardQuery.isError}
          error={dashboardQuery.error as Error}
          onRetry={() => dashboardQuery.refetch()}
        >
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>Today&apos;s Attendance</Text>
              <Ionicons name="checkmark-circle" size={20} color={CoachColors.success} />
            </View>
            <Text style={styles.kpiValue}>{attendancePct || 92}%</Text>
            <Text style={[styles.kpiTrend, { color: CoachColors.success }]}>+2% vs last week</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>Total Students</Text>
              <Ionicons name="people" size={20} color={CoachColors.primary} />
            </View>
            <Text style={styles.kpiValue}>{dashboard?.activeStudents ?? 0}</Text>
            <Text style={styles.kpiMeta}>Active enrollments</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>Training Hours</Text>
              <Ionicons name="timer-outline" size={20} color={CoachColors.tertiary} />
            </View>
            <Text style={styles.kpiValue}>{(dashboard?.batchCount ?? 0) * 8}h</Text>
            <Text style={styles.kpiMeta}>This month</Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Classes</Text>
            <Pressable onPress={() => router.push('/(tabs)/schedule' as never)}>
              <Text style={styles.link}>View Schedule ›</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
            {(scheduleQuery.data ?? []).length === 0 ? (
              <View style={styles.classCard}>
                <Text style={styles.classTitle}>No classes today</Text>
                <Text style={styles.classMeta}>Check your weekly schedule</Text>
              </View>
            ) : (
              (scheduleQuery.data ?? []).slice(0, 5).map((item, index) => (
                <Pressable
                  key={item.batchId}
                  style={styles.classCard}
                  onPress={() =>
                    router.push({
                      pathname: '/coach/batch/[batchId]',
                      params: { batchId: item.batchId },
                    } as never)
                  }
                >
                  <View style={styles.classTop}>
                    <View
                      style={[
                        styles.classAvatar,
                        {
                          backgroundColor:
                            index % 2 === 0 ? CoachColors.softOrange : CoachColors.softGreen,
                        },
                      ]}
                    >
                      <Text style={{ fontWeight: '800', color: CoachColors.foreground }}>
                        {item.batchName[0]?.toUpperCase() ?? 'B'}
                      </Text>
                    </View>
                    <View style={styles.timePill}>
                      <Text style={styles.timePillText}>
                        {item.schedule.split(/[-–]/)[0]?.trim() || '08:00 AM'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.classTitle} numberOfLines={2}>
                    {item.batchName}
                  </Text>
                  <View style={styles.classMetaRow}>
                    <Ionicons name="location-outline" size={12} color={CoachColors.muted} />
                    <Text style={styles.classMeta}>{item.court?.name ?? 'Court'}</Text>
                    <Ionicons name="people-outline" size={12} color={CoachColors.muted} />
                    <Text style={styles.classMeta}>
                      {item.activeStudents}/{item.maxCapacity}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.startBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/coach/session/[batchId]',
                        params: { batchId: item.batchId },
                      } as never)
                    }
                  >
                    <Text style={styles.startBtnText}>Start Session</Text>
                  </Pressable>
                </Pressable>
              ))
            )}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Student Progress Index</Text>
              <Text style={styles.kpiMeta}>Aggregate metrics for last 7 days</Text>
            </View>
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Last 7 days</Text>
            </View>
          </View>
          <View style={styles.chartCard}>
            <MiniBars />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Recent Alerts</Text>
          <View style={styles.alertList}>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: CoachColors.softOrange }]}>
                <Ionicons name="person-add-outline" size={16} color={CoachColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>New student assigned</Text>
                <Text style={styles.kpiMeta}>Check Student Directory</Text>
              </View>
              <Text style={styles.alertTime}>2h</Text>
            </View>
            {(dashboard?.pendingAttendance ?? 0) > 0 ? (
              <View style={styles.alertRow}>
                <View style={[styles.alertIcon, { backgroundColor: CoachColors.softRed }]}>
                  <Ionicons name="heart-outline" size={16} color={CoachColors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Attendance report due</Text>
                  <Text style={styles.kpiMeta}>
                    {dashboard?.pendingAttendance} pending · Overdue
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    const first = scheduleQuery.data?.[0];
                    if (first) {
                      router.push({
                        pathname: '/coach/session/[batchId]',
                        params: { batchId: first.batchId },
                      } as never);
                    } else {
                      router.push('/(tabs)/schedule' as never);
                    }
                  }}
                >
                  <Text style={styles.link}>Log</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: CoachColors.softGreen }]}>
                <Ionicons name="trophy-outline" size={16} color={CoachColors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Elite player milestone</Text>
                <Text style={styles.kpiMeta}>Keep tracking progress reports</Text>
              </View>
            </View>
          </View>
        </QueryState>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => router.push('/coach/qr-attendance' as never)}
      >
        <Ionicons name="qr-code-outline" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  badgeText: {
    color: CoachColors.primaryContainer,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headline: {
    color: CoachColors.foreground,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  subhead: { color: CoachColors.muted, fontSize: FontSize.sm, marginTop: 4 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  actionBtn: {
    alignItems: 'center',
    backgroundColor: '#2e3132',
    borderRadius: Radius.lg,
    flexBasis: '46%',
    flexGrow: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  actionText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
  kpiCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  kpiTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  kpiLabel: { color: CoachColors.muted, fontSize: FontSize.sm, fontWeight: '600' },
  kpiValue: {
    color: CoachColors.foreground,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiTrend: { fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  kpiMeta: { color: CoachColors.muted, fontSize: FontSize.xs, marginTop: 2 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  sectionTitle: { color: CoachColors.foreground, fontSize: FontSize.lg, fontWeight: '800' },
  link: { color: CoachColors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  hScroll: { marginTop: Spacing.md },
  classCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginRight: Spacing.md,
    padding: Spacing.md,
    width: 200,
  },
  classTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  classAvatar: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  timePill: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timePillText: { color: CoachColors.foreground, fontSize: 10, fontWeight: '700' },
  classTitle: {
    color: CoachColors.foreground,
    fontSize: FontSize.md,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  classMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  classMeta: { color: CoachColors.muted, fontSize: FontSize.xs },
  startBtn: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  startBtnText: {
    color: CoachColors.foreground,
    fontSize: FontSize.xs,
    fontWeight: '800',
    textAlign: 'center',
  },
  filterChip: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  filterChipText: { color: CoachColors.muted, fontSize: 10, fontWeight: '700' },
  chartCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  chartRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 80 },
  chartCol: { alignItems: 'center', flex: 1, gap: 6 },
  chartBar: { borderRadius: 6, width: '70%' },
  chartLabel: { color: CoachColors.muted, fontSize: 9, fontWeight: '700' },
  alertList: { gap: Spacing.sm, marginTop: Spacing.md },
  alertRow: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  alertIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  alertTitle: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '700' },
  alertTime: { color: CoachColors.muted, fontSize: 10 },
  fab: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.full,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.lg,
    shadowColor: CoachColors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    width: 56,
  },
});
