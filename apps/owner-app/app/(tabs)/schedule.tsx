import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { CoachHeader } from '@/components/coach-header';
import { QueryState } from '@/components/ui';
import { getTrainerSchedule } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatRange(start: Date) {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function TrainingScheduleScreen() {
  const { token, isCoachMode } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedOffset, setSelectedOffset] = useState(() => {
    const today = new Date();
    const monday = startOfWeek(today);
    return Math.round((today.getTime() - monday.getTime()) / 86400000);
  });

  const scheduleQuery = useQuery({
    queryKey: ['trainer', 'schedule'],
    queryFn: async () => (await getTrainerSchedule(token!)).items,
    enabled: !!token,
  });

  const days = useMemo(
    () => DAY_LABELS.map((label, i) => ({ label, date: addDays(weekStart, i), offset: i })),
    [weekStart],
  );

  const items = scheduleQuery.data ?? [];

  if (!isCoachMode) {
    // Owner users shouldn't hit this tab; keep a minimal fallback.
    return (
      <View style={[styles.root, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.meta}>Switch to Coach login to manage training schedule.</Text>
      </View>
    );
  }

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

        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>Weekly Schedule</Text>
          <View style={styles.rangeRow}>
            <Pressable onPress={() => setWeekStart((w) => addDays(w, -7))}>
              <Ionicons name="chevron-back" size={18} color={CoachColors.foreground} />
            </Pressable>
            <Text style={styles.rangeText}>{formatRange(weekStart)}</Text>
            <Pressable onPress={() => setWeekStart((w) => addDays(w, 7))}>
              <Ionicons name="chevron-forward" size={18} color={CoachColors.foreground} />
            </Pressable>
          </View>
          <View style={styles.dayRow}>
            {days.map((day) => {
              const active = day.offset === selectedOffset;
              return (
                <Pressable
                  key={day.label}
                  onPress={() => setSelectedOffset(day.offset)}
                  style={[styles.dayCell, active && styles.dayCellActive]}
                >
                  <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>
                    {day.label}
                  </Text>
                  <Text style={[styles.dayNum, active && styles.dayLabelActive]}>
                    {day.date.getDate()}
                  </Text>
                  {active ? <View style={styles.dayDot} /> : <View style={styles.dayDotSpacer} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <QueryState
          isLoading={scheduleQuery.isLoading}
          isError={scheduleQuery.isError}
          error={scheduleQuery.error as Error}
          onRetry={() => scheduleQuery.refetch()}
        >
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Enjoy your rest!</Text>
              <Text style={styles.meta}>Recovery is part of the training.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {items.map((item, index) => {
                const time =
                  item.schedule.includes('-') || item.schedule.includes('–')
                    ? item.schedule
                    : `${item.schedule} — Session`;
                const accent = index === 0;
                return (
                  <View key={item.batchId} style={styles.timelineRow}>
                    <View style={styles.rail}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: accent ? CoachColors.danger : CoachColors.primary },
                        ]}
                      />
                      {index < items.length - 1 ? <View style={styles.line} /> : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: Spacing.lg }}>
                      <Text style={styles.time}>{time}</Text>
                      <Pressable
                        style={[
                          styles.classCard,
                          accent && { borderLeftColor: CoachColors.danger, borderLeftWidth: 3 },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: '/coach/batch/[batchId]',
                            params: { batchId: item.batchId },
                          } as never)
                        }
                      >
                        <View style={styles.classTop}>
                          <Text style={styles.classTitle}>{item.batchName}</Text>
                          <Ionicons name="chevron-forward" size={16} color={CoachColors.muted} />
                        </View>
                        <Text style={styles.program}>{item.program.name}</Text>
                        <View style={styles.tags}>
                          <View
                            style={[
                              styles.tag,
                              {
                                backgroundColor: accent ? CoachColors.softRed : CoachColors.mutedBg,
                              },
                            ]}
                          >
                            <Ionicons
                              name="location-outline"
                              size={12}
                              color={accent ? CoachColors.danger : CoachColors.muted}
                            />
                            <Text
                              style={{
                                color: accent ? CoachColors.danger : CoachColors.muted,
                                fontSize: 11,
                                fontWeight: '700',
                              }}
                            >
                              {item.court?.name ?? 'Venue'}
                            </Text>
                          </View>
                          <View style={[styles.tag, { backgroundColor: CoachColors.softGreen }]}>
                            <Ionicons
                              name="people-outline"
                              size={12}
                              color={CoachColors.secondary}
                            />
                            <Text
                              style={{
                                color: CoachColors.secondary,
                                fontSize: 11,
                                fontWeight: '700',
                              }}
                            >
                              {item.activeStudents} Players
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </QueryState>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => router.push('/coach/training-plan' as never)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { color: CoachColors.foreground, fontSize: FontSize.xxl, fontWeight: '800' },
  meta: { color: CoachColors.muted, fontSize: FontSize.sm, marginTop: 4 },
  weekCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
  },
  weekTitle: { color: CoachColors.foreground, fontSize: FontSize.lg, fontWeight: '800' },
  rangeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  rangeText: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '700' },
  dayRow: { flexDirection: 'row', marginTop: Spacing.lg },
  dayCell: { alignItems: 'center', borderRadius: Radius.md, flex: 1, paddingVertical: 8 },
  dayCellActive: { backgroundColor: CoachColors.primary },
  dayLabel: { color: CoachColors.muted, fontSize: 9, fontWeight: '800' },
  dayNum: {
    color: CoachColors.foreground,
    fontSize: FontSize.md,
    fontWeight: '800',
    marginTop: 2,
  },
  dayLabelActive: { color: '#fff' },
  dayDot: {
    backgroundColor: '#1c1b1b',
    borderRadius: 3,
    height: 4,
    marginTop: 4,
    width: 4,
  },
  dayDotSpacer: { height: 8 },
  timeline: { marginTop: Spacing.xl },
  timelineRow: { flexDirection: 'row', gap: Spacing.md },
  rail: { alignItems: 'center', width: 16 },
  dot: { borderRadius: 6, height: 12, marginTop: 4, width: 12 },
  line: { backgroundColor: CoachColors.border, flex: 1, marginVertical: 4, width: 2 },
  time: { color: CoachColors.muted, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 6 },
  classCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  classTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  classTitle: { color: CoachColors.foreground, flex: 1, fontSize: FontSize.md, fontWeight: '800' },
  program: { color: CoachColors.muted, fontSize: FontSize.sm, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm },
  tag: {
    alignItems: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  empty: { alignItems: 'center', marginTop: Spacing.xxxl, padding: Spacing.xl },
  emptyTitle: { color: CoachColors.foreground, fontSize: FontSize.lg, fontWeight: '800' },
  fab: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.full,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
  },
});
