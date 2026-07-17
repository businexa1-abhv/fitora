import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { CoachHeader } from '@/components/coach-header';
import { QueryState } from '@/components/ui';
import { getTrainerBatches, getTrainerPerformance } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/** Derive display earnings from live performance until payroll APIs expose coach payouts. */
function deriveEarnings(sessionsMarked: number, attendanceRate: number, activeStudents: number) {
  const baseSalary = 2500;
  const commissionPerSession = 45;
  const commissions = sessionsMarked * commissionPerSession;
  const performanceBonus =
    attendanceRate >= 90 ? 250 : attendanceRate >= 75 ? 120 : attendanceRate >= 60 ? 50 : 0;
  const total = baseSalary + commissions + performanceBonus;
  const pending = Math.round(total * 0.27);
  const avg = Math.round(total * 0.9);
  const trend = MONTHS.map((_, i) => {
    const factor = 0.72 + i * 0.05 + (i === MONTHS.length - 1 ? 0.08 : 0);
    return Math.round(avg * factor);
  });
  return {
    baseSalary,
    commissions,
    performanceBonus,
    total,
    pending,
    avg,
    trend,
    nextPayoutLabel: new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      1,
    ).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    sessionLogs: [
      {
        id: '1',
        title: 'Batch sessions',
        meta: `${sessionsMarked} marked this period`,
        amount: commissions,
        kind: 'Commission' as const,
        tone: 'orange' as const,
        icon: 'timer-outline' as const,
      },
      {
        id: '2',
        title: 'Active roster',
        meta: `${activeStudents} students`,
        amount: Math.round(activeStudents * 8),
        kind: 'Commission' as const,
        tone: 'orange' as const,
        icon: 'person-outline' as const,
      },
      {
        id: '3',
        title: 'Performance Bonus',
        meta: `Attendance ${attendanceRate}%`,
        amount: performanceBonus,
        kind: 'Reward' as const,
        tone: 'blue' as const,
        icon: 'ribbon-outline' as const,
      },
    ].filter((row) => row.amount > 0),
  };
}

function TrendChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.chartArea}>
      <View style={styles.chartBars}>
        {values.map((v, i) => {
          const h = Math.max(12, (v / max) * 100);
          const active = i === values.length - 1;
          return (
            <View key={MONTHS[i]} style={styles.chartCol}>
              <View style={styles.chartTrack}>
                <View
                  style={[
                    styles.chartFill,
                    {
                      height: `${h}%`,
                      backgroundColor: active ? CoachColors.primary : CoachColors.chartBar,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.chartLabel, active && styles.chartLabelActive]}>
                {MONTHS[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function CoachEarningsScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const performanceQuery = useQuery({
    queryKey: ['trainer', 'performance'],
    queryFn: () => getTrainerPerformance(token!),
    enabled: !!token,
  });

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches', 'earnings'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  const performance = performanceQuery.data;
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const earnings = deriveEarnings(
    performance?.sessionsMarked ?? 0,
    performance?.attendanceRate ?? 0,
    performance?.activeStudents ?? 0,
  );

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

        <View style={styles.periodRow}>
          <View style={styles.periodChip}>
            <Ionicons name="calendar-outline" size={14} color={CoachColors.foreground} />
            <Text style={styles.periodText}>{monthLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={CoachColors.muted} />
          </View>
          <Pressable style={styles.downloadBtn}>
            <Ionicons name="download-outline" size={18} color="#fff" />
          </Pressable>
        </View>

        <QueryState
          isLoading={performanceQuery.isLoading || batchesQuery.isLoading}
          isError={performanceQuery.isError}
          error={performanceQuery.error as Error}
          onRetry={() => performanceQuery.refetch()}
        >
          <View style={styles.totalCard}>
            <View style={styles.totalTop}>
              <View>
                <Text style={styles.totalLabel}>TOTAL EARNINGS</Text>
                <View style={styles.totalAmountRow}>
                  <Text style={styles.totalAmount}>{formatCurrency(earnings.total)}</Text>
                  <View style={styles.paidPill}>
                    <Text style={styles.paidText}>Paid</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="trending-up" size={36} color="rgba(255,255,255,0.35)" />
            </View>
            <View style={styles.totalFooter}>
              <View>
                <Text style={styles.footerLabel}>Pending Settlement</Text>
                <Text style={styles.footerValue}>{formatCurrency(earnings.pending)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.footerLabel}>Next Payout</Text>
                <Text style={styles.footerValue}>{earnings.nextPayoutLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.splitRow}>
            <View style={styles.splitCard}>
              <Ionicons name="wallet-outline" size={18} color={CoachColors.primary} />
              <Text style={styles.splitLabel}>BASE SALARY</Text>
              <Text style={styles.splitValue}>{formatCurrency(earnings.baseSalary)}</Text>
            </View>
            <View style={styles.splitCard}>
              <Ionicons name="fitness-outline" size={18} color={CoachColors.primary} />
              <Text style={styles.splitLabel}>COMMISSIONS</Text>
              <Text style={styles.splitValue}>{formatCurrency(earnings.commissions)}</Text>
            </View>
          </View>

          <View style={styles.trendCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>6-Month Trend</Text>
              <Text style={styles.avgText}>
                Avg: {formatCurrency(earnings.avg).replace(/\.00$/, '')}
              </Text>
            </View>
            <TrendChart values={earnings.trend} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Session Log</Text>
            <Pressable onPress={() => router.push('/(tabs)/schedule' as never)}>
              <Text style={styles.link}>View All</Text>
            </Pressable>
          </View>

          <View style={styles.logList}>
            {earnings.sessionLogs.map((row) => (
              <View key={row.id} style={styles.logRow}>
                <View
                  style={[
                    styles.logAccent,
                    {
                      backgroundColor:
                        row.tone === 'blue' ? '#3d4f6f' : CoachColors.primaryContainer,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.logIcon,
                    {
                      backgroundColor: row.tone === 'blue' ? '#e8eef8' : CoachColors.softOrange,
                    },
                  ]}
                >
                  <Ionicons
                    name={row.icon}
                    size={16}
                    color={row.tone === 'blue' ? '#3d4f6f' : CoachColors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logTitle}>{row.title}</Text>
                  <Text style={styles.logMeta}>{row.meta}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.logAmount}>+{formatCurrency(row.amount)}</Text>
                  <Text style={styles.logKind}>{row.kind}</Text>
                </View>
              </View>
            ))}
            {(batchesQuery.data ?? []).slice(0, 2).map((batch) => (
              <Pressable
                key={batch.id}
                style={styles.logRow}
                onPress={() =>
                  router.push({
                    pathname: '/coach/batch/[batchId]',
                    params: { batchId: batch.id },
                  } as never)
                }
              >
                <View style={[styles.logAccent, { backgroundColor: CoachColors.primary }]} />
                <View style={[styles.logIcon, { backgroundColor: CoachColors.softOrange }]}>
                  <Ionicons name="school-outline" size={16} color={CoachColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logTitle}>{batch.name}</Text>
                  <Text style={styles.logMeta}>{batch.program?.name ?? 'Batch'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={CoachColors.muted} />
              </Pressable>
            ))}
          </View>
        </QueryState>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  periodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  periodChip: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  periodText: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '700' },
  downloadBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.brand,
    borderRadius: Radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  totalCard: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    overflow: 'hidden',
    padding: Spacing.lg,
  },
  totalTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  totalAmountRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, marginTop: 6 },
  totalAmount: { color: '#fff', fontSize: 36, fontWeight: '800' },
  paidPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paidText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  totalFooter: {
    borderTopColor: 'rgba(255,255,255,0.2)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  footerLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  footerValue: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800', marginTop: 2 },
  splitRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  splitCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flex: 1,
    gap: 6,
    padding: Spacing.md,
  },
  splitLabel: {
    color: CoachColors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  splitValue: { color: CoachColors.foreground, fontSize: FontSize.lg, fontWeight: '800' },
  trendCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  sectionTitle: { color: CoachColors.foreground, fontSize: FontSize.lg, fontWeight: '800' },
  avgText: { color: CoachColors.muted, fontSize: FontSize.sm, fontWeight: '700' },
  link: { color: CoachColors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  chartArea: { marginTop: Spacing.md },
  chartBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 110 },
  chartCol: { alignItems: 'center', flex: 1, height: '100%' },
  chartTrack: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  chartFill: { borderRadius: 8, width: '100%' },
  chartLabel: { color: CoachColors.muted, fontSize: 10, fontWeight: '700', marginTop: 6 },
  chartLabelActive: { color: CoachColors.brand, fontWeight: '800' },
  logList: { gap: Spacing.sm, marginTop: Spacing.md },
  logRow: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    overflow: 'hidden',
    paddingRight: Spacing.md,
    paddingVertical: Spacing.md,
  },
  logAccent: { alignSelf: 'stretch', width: 4 },
  logIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    width: 36,
  },
  logTitle: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '800' },
  logMeta: { color: CoachColors.muted, fontSize: FontSize.xs, marginTop: 2 },
  logAmount: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '800' },
  logKind: {
    color: CoachColors.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
