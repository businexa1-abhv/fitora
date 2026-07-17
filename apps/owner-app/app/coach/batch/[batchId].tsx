import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EnrollmentStatus } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { QueryState } from '@/components/ui';
import { getTrainerBatches } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function TrainingBatchDetailScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  const batch = useMemo(
    () => (batchesQuery.data ?? []).find((b) => b.id === batchId),
    [batchesQuery.data, batchId],
  );

  const active = batch?.enrollments?.filter((e) => e.status === EnrollmentStatus.ACTIVE) ?? [];
  const capacity = batch?.maxCapacity ?? Math.max(active.length, 1);
  const fill = Math.min(100, Math.round((active.length / capacity) * 100));
  const sport = String(batch?.program?.sportType ?? batch?.program?.name ?? 'Training');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={CoachColors.brand} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {batch?.name ?? 'Batch'}
        </Text>
        <Ionicons name="ellipsis-horizontal" size={20} color={CoachColors.muted} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xxxl,
        }}
      >
        <QueryState
          isLoading={batchesQuery.isLoading}
          isError={batchesQuery.isError}
          error={batchesQuery.error as Error}
          onRetry={() => batchesQuery.refetch()}
        >
          {!batch ? (
            <Text style={styles.muted}>Batch not found.</Text>
          ) : (
            <>
              <View style={styles.overview}>
                <View style={styles.tags}>
                  <View style={[styles.tag, { backgroundColor: CoachColors.primary }]}>
                    <Text style={styles.tagWhite}>{sport}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: '#e8eef5' }]}>
                    <Text style={{ color: '#3d5a80', fontSize: 11, fontWeight: '800' }}>
                      Active
                    </Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color={CoachColors.muted} />
                  <Text style={styles.muted}>{batch.program?.court?.name ?? 'Venue court'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color={CoachColors.muted} />
                  <Text style={styles.muted}>{batch.schedule || 'Schedule TBD'}</Text>
                </View>
                <Text style={styles.capacityLabel}>
                  {active.length} / {capacity} Students
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${fill}%` }]} />
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpi}>
                  <Text style={styles.kpiLabel}>Avg Attendance</Text>
                  <View style={styles.kpiValueRow}>
                    <Text style={styles.kpiValue}>88%</Text>
                    <Ionicons name="trending-up" size={16} color={CoachColors.success} />
                  </View>
                </View>
                <View style={styles.kpi}>
                  <Text style={styles.kpiLabel}>Active Students</Text>
                  <Text style={styles.kpiValue}>{active.length}</Text>
                  <Text style={styles.kpiMeta}>Assigned to this batch</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.startBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/coach/session/[batchId]',
                      params: { batchId },
                    } as never)
                  }
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.startText}>Start Session</Text>
                </Pressable>
                <Pressable
                  style={styles.attBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/coach/session/[batchId]',
                      params: { batchId },
                    } as never)
                  }
                >
                  <Ionicons name="person-outline" size={16} color={CoachColors.primary} />
                  <Text style={styles.attText}>Attendance</Text>
                </Pressable>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>STUDENT ROSTER</Text>
                <Pressable onPress={() => router.push('/(tabs)/students' as never)}>
                  <Text style={styles.link}>View All</Text>
                </Pressable>
              </View>

              <View style={{ gap: Spacing.sm }}>
                {active.slice(0, 8).map((enrollment, i) => {
                  const kid = enrollment.kid;
                  const name = kid ? `${kid.firstName} ${kid.lastName}`.trim() : 'Student';
                  const initials = name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const att = 82 + ((i * 7) % 18);
                  return (
                    <Pressable
                      key={enrollment.id}
                      style={styles.studentCard}
                      onPress={() =>
                        router.push({
                          pathname: '/coach/student/[enrollmentId]',
                          params: { enrollmentId: enrollment.id },
                        } as never)
                      }
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{name}</Text>
                        <View style={styles.streakRow}>
                          <Ionicons name="flame" size={12} color={CoachColors.primary} />
                          <Text style={styles.kpiMeta}>{3 + i} day streak</Text>
                        </View>
                      </View>
                      <Text style={styles.attPct}>{att}% Att.</Text>
                      <Ionicons name="chevron-forward" size={16} color={CoachColors.muted} />
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.quickRow}>
                <Pressable
                  style={styles.quickCard}
                  onPress={() => router.push('/coach/notes' as never)}
                >
                  <Ionicons name="create-outline" size={22} color={CoachColors.primary} />
                  <Text style={styles.quickText}>Add Note</Text>
                </Pressable>
                <Pressable
                  style={styles.quickCard}
                  onPress={() => router.push('/coach/training-plan' as never)}
                >
                  <Ionicons name="compass-outline" size={22} color={CoachColors.primary} />
                  <Text style={styles.quickText}>Training Plan</Text>
                </Pressable>
              </View>
            </>
          )}
        </QueryState>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: CoachColors.background, flex: 1 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { color: CoachColors.brand, flex: 1, fontSize: FontSize.lg, fontWeight: '800' },
  overview: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  tags: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  tag: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagWhite: { color: '#fff', fontSize: 11, fontWeight: '800' },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 6 },
  muted: { color: CoachColors.muted, fontSize: FontSize.sm },
  capacityLabel: {
    color: CoachColors.foreground,
    fontSize: FontSize.sm,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  track: {
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    height: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: { backgroundColor: CoachColors.primary, height: '100%' },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  kpi: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flex: 1,
    padding: Spacing.md,
  },
  kpiLabel: { color: CoachColors.muted, fontSize: FontSize.xs, fontWeight: '700' },
  kpiValueRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  kpiValue: { color: CoachColors.foreground, fontSize: FontSize.xxl, fontWeight: '800' },
  kpiMeta: { color: CoachColors.muted, fontSize: FontSize.xs, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  startBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    flex: 1.2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  startText: { color: '#fff', fontWeight: '800' },
  attBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  attText: { color: CoachColors.primary, fontWeight: '800' },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    color: CoachColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  link: { color: CoachColors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  studentCard: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { color: CoachColors.primaryContainer, fontSize: FontSize.sm, fontWeight: '800' },
  studentName: { color: CoachColors.foreground, fontSize: FontSize.md, fontWeight: '800' },
  streakRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 2 },
  attPct: { color: CoachColors.brand, fontSize: FontSize.xs, fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  quickCard: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.lg,
    flex: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  quickText: { color: CoachColors.brand, fontSize: FontSize.sm, fontWeight: '800' },
});
