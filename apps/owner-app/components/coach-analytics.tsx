import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { CoachHeader } from '@/components/coach-header';
import { QueryState } from '@/components/ui';
import { getTrainerBatches, getTrainerPerformance } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function AttendanceBars() {
  const heights = [42, 58, 50, 66, 54, 48, 62];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <View style={styles.barRow}>
      {heights.map((h, i) => (
        <View key={days[i]} style={styles.barCol}>
          <View style={[styles.bar, { height: h }]} />
          <Text style={styles.barLabel}>{days[i]}</Text>
        </View>
      ))}
    </View>
  );
}

function SkillDonut({
  beginner,
  intermediate,
  advanced,
  total,
}: {
  beginner: number;
  intermediate: number;
  advanced: number;
  total: number;
}) {
  return (
    <View style={styles.donutWrap}>
      <View style={styles.donutOuter}>
        <View style={styles.donutInner}>
          <Text style={styles.donutTotal}>{total}</Text>
          <Text style={styles.donutSub}>Total</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <LegendRow color="#7a3000" label="Beginner" value={`${beginner}%`} />
        <LegendRow color={CoachColors.primary} label="Intermediate" value={`${intermediate}%`} />
        <LegendRow color={CoachColors.success} label="Advanced" value={`${advanced}%`} />
      </View>
    </View>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

export function CoachAnalyticsScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const performanceQuery = useQuery({
    queryKey: ['trainer', 'performance'],
    queryFn: () => getTrainerPerformance(token!),
    enabled: !!token,
  });

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches', 'analytics'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  const performance = performanceQuery.data;
  const students =
    batchesQuery.data?.flatMap((b) =>
      (b.enrollments ?? []).map((e) => ({
        enrollmentId: e.id,
        name: e.kid ? `${e.kid.firstName} ${e.kid.lastName}` : 'Student',
        batch: b.name,
      })),
    ) ?? [];
  const total = performance?.activeStudents ?? students.length;
  const beginner = 20;
  const intermediate = 50;
  const advanced = 30;

  return (
    <View style={[styles.root, { backgroundColor: CoachColors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <CoachHeader />
        <Text style={styles.title}>Performance Insights</Text>
        <Text style={styles.subtitle}>
          Stay informed on your coaching impact and student progress.
        </Text>

        <View style={styles.filterRow}>
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={14} color={CoachColors.foreground} />
            <Text style={styles.dateChipText}>Last 30 Days</Text>
          </View>
          <Pressable style={styles.exportBtn}>
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={styles.exportText}>Export Report</Text>
          </Pressable>
        </View>

        <QueryState
          isLoading={performanceQuery.isLoading}
          isError={performanceQuery.isError}
          error={performanceQuery.error as Error}
          onRetry={() => performanceQuery.refetch()}
        >
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Average Attendance</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{Math.round(performance?.attendanceRate ?? 88)}%</Text>
              <Text style={[styles.trend, { color: CoachColors.success }]}>+5%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.round(performance?.attendanceRate ?? 88))}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Skill Improvement</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>+{performance?.progressReportsWritten ?? 12}%</Text>
              <Text style={[styles.trend, { color: CoachColors.success }]}>+3%</Text>
            </View>
            <Text style={styles.kpiMeta}>Aggregate across all active students.</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Parent Satisfaction</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>
                {performance?.averageRating != null
                  ? `${performance.averageRating.toFixed(1)}/5`
                  : '4.8/5'}
              </Text>
              <Text style={styles.kpiMeta}>Steady</Text>
            </View>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= 4 ? 'star' : 'star-half'}
                  size={16}
                  color={CoachColors.primary}
                />
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Attendance Trends</Text>
          <View style={styles.card}>
            <AttendanceBars />
          </View>

          <Text style={styles.sectionTitle}>Student Skill Distribution</Text>
          <View style={styles.card}>
            <SkillDonut
              beginner={beginner}
              intermediate={intermediate}
              advanced={advanced}
              total={total || 142}
            />
          </View>

          <Text style={styles.sectionTitle}>Top Performers</Text>
          <View style={styles.card}>
            {(students.length
              ? students
              : [{ enrollmentId: '', name: 'No students yet', batch: '—' }]
            )
              .slice(0, 3)
              .map((s, i) => (
                <Pressable
                  key={`${s.name}-${i}`}
                  style={styles.performerRow}
                  disabled={!s.enrollmentId}
                  onPress={() =>
                    router.push({
                      pathname: '/coach/report/[enrollmentId]',
                      params: { enrollmentId: s.enrollmentId },
                    } as never)
                  }
                >
                  <View>
                    <Text style={styles.performerName}>{s.name}</Text>
                    <Text style={styles.kpiMeta}>Level · {s.batch}</Text>
                  </View>
                  <Text style={[styles.trend, { color: CoachColors.success }]}>
                    +{(2.4 - i * 0.6).toFixed(1)}
                  </Text>
                </Pressable>
              ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Renewals</Text>
            <Text style={styles.kpiMeta}>Next 14 Days</Text>
          </View>
          <View style={styles.card}>
            {(students.length ? students : [{ name: '—', batch: 'No renewals' }])
              .slice(0, 5)
              .map((s, i) => {
                const daysLeft = 2 + i * 2;
                const urgent = daysLeft <= 3;
                return (
                  <View key={`renew-${i}`} style={styles.renewRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.performerName}>{s.name}</Text>
                      <Text style={styles.kpiMeta}>{s.batch}</Text>
                    </View>
                    <View
                      style={[
                        styles.renewBadge,
                        {
                          backgroundColor: urgent
                            ? CoachColors.softRed
                            : daysLeft <= 6
                              ? CoachColors.softOrange
                              : CoachColors.mutedBg,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: urgent
                            ? CoachColors.danger
                            : daysLeft <= 6
                              ? CoachColors.primaryContainer
                              : CoachColors.muted,
                          fontSize: 10,
                          fontWeight: '800',
                        }}
                      >
                        {daysLeft} Days Left
                      </Text>
                    </View>
                  </View>
                );
              })}
          </View>
        </QueryState>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: {
    color: CoachColors.foreground,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginTop: Spacing.xl,
  },
  subtitle: { color: CoachColors.muted, fontSize: FontSize.sm, marginTop: 4 },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  dateChip: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  dateChipText: { color: CoachColors.foreground, fontSize: FontSize.xs, fontWeight: '700' },
  exportBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  exportText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
  kpiCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  kpiLabel: { color: CoachColors.muted, fontSize: FontSize.sm, fontWeight: '600' },
  kpiValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  kpiValue: { color: CoachColors.foreground, fontSize: 28, fontWeight: '800' },
  trend: { fontSize: FontSize.sm, fontWeight: '800' },
  kpiMeta: { color: CoachColors.muted, fontSize: FontSize.xs, marginTop: 2 },
  progressTrack: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.full,
    height: 6,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: '#7a3000', height: '100%' },
  stars: { flexDirection: 'row', gap: 2, marginTop: Spacing.sm },
  sectionTitle: {
    color: CoachColors.foreground,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  card: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  barRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 90 },
  barCol: { alignItems: 'center', flex: 1, gap: 6 },
  bar: {
    backgroundColor: '#5a4136',
    borderRadius: 6,
    width: '70%',
  },
  barLabel: { color: CoachColors.muted, fontSize: 9, fontWeight: '700' },
  donutWrap: { alignItems: 'center', flexDirection: 'row', gap: Spacing.lg },
  donutOuter: {
    alignItems: 'center',
    borderColor: CoachColors.primary,
    borderRadius: 60,
    borderWidth: 14,
    height: 120,
    justifyContent: 'center',
    width: 120,
  },
  donutInner: { alignItems: 'center' },
  donutTotal: { color: CoachColors.foreground, fontSize: FontSize.xl, fontWeight: '800' },
  donutSub: { color: CoachColors.muted, fontSize: 10 },
  legend: { flex: 1, gap: Spacing.sm },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  legendDot: { borderRadius: 4, height: 10, width: 10 },
  legendLabel: { color: CoachColors.muted, flex: 1, fontSize: FontSize.xs },
  legendValue: { color: CoachColors.foreground, fontSize: FontSize.xs, fontWeight: '800' },
  performerRow: {
    alignItems: 'center',
    borderBottomColor: CoachColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  performerName: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '800' },
  renewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  renewBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
});
