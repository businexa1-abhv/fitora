import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { QueryState } from '@/components/ui';
import { getTrainerPerformance } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CoachPerformanceScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const performanceQuery = useQuery({
    queryKey: ['trainer', 'performance'],
    queryFn: () => getTrainerPerformance(token!),
    enabled: !!token,
  });

  const data = performanceQuery.data;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: CoachColors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <Text style={[styles.kicker, { color: CoachColors.muted }]}>COACH DASHBOARD</Text>
      <Text style={[styles.title, { color: CoachColors.foreground }]}>My Performance</Text>
      <Text style={{ color: CoachColors.muted, marginTop: 4 }}>
        Your training metrics and impact overview.
      </Text>

      <QueryState
        isLoading={performanceQuery.isLoading}
        isError={performanceQuery.isError}
        error={performanceQuery.error as Error}
        onRetry={() => performanceQuery.refetch()}
      >
        {data ? (
          <>
            <View style={styles.grid}>
              <StatCard
                icon="checkmark-circle-outline"
                label="Attendance Rate"
                value={data.attendanceRate != null ? `${Math.round(data.attendanceRate)}%` : '—'}
                tone="up"
              />
              <StatCard
                icon="people-outline"
                label="Active Students"
                value={String(data.activeStudents ?? 0)}
                tone="steady"
              />
              <StatCard
                icon="clipboard-outline"
                label="Sessions Marked"
                value={String(data.sessionsMarked ?? 0)}
                tone="steady"
              />
              <StatCard
                icon="document-text-outline"
                label="Progress Reports"
                value={String(data.progressReportsWritten ?? 0)}
                tone="up"
              />
            </View>

            {data.averageRating != null ? (
              <View style={styles.ratingCard}>
                <Ionicons name="star" size={28} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: CoachColors.foreground,
                      fontWeight: '800',
                      fontSize: FontSize.xxl,
                    }}
                  >
                    {Number(data.averageRating).toFixed(1)}
                  </Text>
                  <Text style={{ color: CoachColors.muted, fontSize: FontSize.sm }}>
                    Average student rating
                    {data.yearsExperience != null
                      ? ` · ${data.yearsExperience} year${data.yearsExperience !== 1 ? 's' : ''} experience`
                      : ''}
                  </Text>
                </View>
                {data.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>VERIFIED</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {data.leaveRequests ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: CoachColors.foreground }]}>
                  Leave Summary
                </Text>
                <View style={styles.leaveRow}>
                  <LeaveChip
                    label="Pending"
                    count={data.leaveRequests.pending ?? 0}
                    color="#f59e0b"
                  />
                  <LeaveChip
                    label="Approved"
                    count={data.leaveRequests.approved ?? 0}
                    color="#006c49"
                  />
                  <LeaveChip
                    label="Rejected"
                    count={data.leaveRequests.rejected ?? 0}
                    color="#ba1a1a"
                  />
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </QueryState>
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: 'up' | 'down' | 'steady';
}) {
  const bgMap = { up: '#d1fae5', down: '#fee2e2', steady: CoachColors.softOrange } as const;
  const colorMap = { up: '#006c49', down: '#ba1a1a', steady: CoachColors.brand } as const;
  return (
    <View style={[styles.statCard, { backgroundColor: bgMap[tone] }]}>
      <Ionicons name={icon} size={20} color={colorMap[tone]} />
      <Text style={[styles.statValue, { color: CoachColors.foreground }]}>{value}</Text>
      <Text style={{ color: CoachColors.muted, fontSize: FontSize.xs, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function LeaveChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.leaveChip, { borderColor: color }]}>
      <Text style={{ color, fontWeight: '800', fontSize: FontSize.lg }}>{count}</Text>
      <Text style={{ color: CoachColors.muted, fontSize: FontSize.xs }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.xl },
  statCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexBasis: '46%',
    flexGrow: 1,
    gap: 4,
    padding: Spacing.md,
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: '800' },
  ratingCard: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
  },
  verifiedBadge: {
    alignItems: 'center',
    backgroundColor: '#006c49',
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  section: { marginTop: Spacing.xl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md },
  leaveRow: { flexDirection: 'row', gap: Spacing.md },
  leaveChip: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    flex: 1,
    gap: 2,
    padding: Spacing.md,
  },
});
