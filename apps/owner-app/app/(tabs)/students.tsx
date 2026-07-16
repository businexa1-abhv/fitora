import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { CoachHeader } from '@/components/coach-header';
import { QueryState } from '@/components/ui';
import { getTrainerBatches } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type Level = 'Beginner' | 'Intermediate' | 'Pro' | 'All';

function levelForIndex(i: number): Exclude<Level, 'All'> {
  const levels: Exclude<Level, 'All'>[] = ['Beginner', 'Intermediate', 'Pro'];
  return levels[i % 3];
}

function levelColor(level: string) {
  if (level === 'Pro') return { bg: CoachColors.softOrange, fg: CoachColors.primaryContainer };
  if (level === 'Intermediate') return { bg: CoachColors.softGreen, fg: CoachColors.secondary };
  return { bg: CoachColors.mutedBg, fg: CoachColors.muted };
}

function AttendanceSpark({ seed }: { seed: number }) {
  const heights = [10, 16, 12, 18, 14].map((h, i) => h + ((seed + i) % 5));
  return (
    <View style={styles.sparkWrap}>
      <View style={styles.sparkRow}>
        {heights.map((h, i) => (
          <View
            key={i}
            style={[styles.sparkBar, { height: h, backgroundColor: CoachColors.primary }]}
          />
        ))}
      </View>
      <Text style={styles.sparkLabel}>Attendance</Text>
    </View>
  );
}

export default function StudentsScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches', 'students'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  const students = useMemo(() => {
    const rows: {
      key: string;
      name: string;
      sport: string;
      level: Exclude<Level, 'All'>;
      seed: number;
    }[] = [];
    (batchesQuery.data ?? []).forEach((batch, bi) => {
      const sport = String(batch.program?.sportType ?? batch.program?.name ?? 'Training');
      (batch.enrollments ?? []).forEach((enrollment, ei) => {
        const kid = enrollment.kid;
        if (!kid) return;
        const name = `${kid.firstName} ${kid.lastName}`.trim();
        rows.push({
          key: enrollment.id,
          name,
          sport,
          level: levelForIndex(bi + ei),
          seed: bi * 10 + ei,
        });
      });
    });
    return rows;
  }, [batchesQuery.data]);

  const sports = useMemo(() => {
    const set = new Set(students.map((s) => s.sport));
    return Array.from(set).slice(0, 3);
  }, [students]);

  const filtered = students.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || s.name.toLowerCase().includes(q) || s.sport.toLowerCase().includes(q);
    const matchesFilter = filter === 'All' || s.level === filter || s.sport === filter;
    return matchesQuery && matchesFilter;
  });

  const chips = ['All', 'Intermediate', 'Pro', 'Beginner', ...sports];

  return (
    <View style={[styles.root, { backgroundColor: CoachColors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: Spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <CoachHeader />
        <Text style={styles.title}>Student Directory</Text>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={CoachColors.muted} />
          <TextInput
            placeholder="Search by name or skill..."
            placeholderTextColor={CoachColors.muted}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {chips.map((chip) => {
            const active = filter === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => setFilter(chip)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <QueryState
          isLoading={batchesQuery.isLoading}
          isError={batchesQuery.isError}
          error={batchesQuery.error as Error}
          onRetry={() => batchesQuery.refetch()}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={32} color={CoachColors.muted} />
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptyBody}>
                Students appear here from your assigned training batches.
              </Text>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
              {filtered.map((student) => {
                const colors = levelColor(student.level);
                return (
                  <Pressable
                    key={student.key}
                    style={styles.card}
                    onPress={() =>
                      router.push({
                        pathname: '/coach/student/[enrollmentId]',
                        params: { enrollmentId: student.key },
                      } as never)
                    }
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {student.name
                          .split(' ')
                          .map((p) => p[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{student.name}</Text>
                      <View style={styles.metaRow}>
                        <View style={[styles.levelPill, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.levelText, { color: colors.fg }]}>
                            {student.level}
                          </Text>
                        </View>
                        <Text style={styles.sport}>• {student.sport}</Text>
                      </View>
                    </View>
                    <AttendanceSpark seed={student.seed} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </QueryState>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => router.push('/coach/qr-attendance' as never)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
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
  search: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    color: CoachColors.foreground,
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
  },
  chips: { marginTop: Spacing.md },
  chip: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: CoachColors.primary },
  chipText: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  card: {
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
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: CoachColors.primaryContainer, fontSize: FontSize.sm, fontWeight: '800' },
  name: { color: CoachColors.foreground, fontSize: FontSize.md, fontWeight: '800' },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
  levelPill: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  levelText: { fontSize: 10, fontWeight: '800' },
  sport: { color: CoachColors.muted, fontSize: FontSize.xs },
  sparkWrap: { alignItems: 'center', width: 56 },
  sparkRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 2, height: 20 },
  sparkBar: { borderRadius: 2, width: 6 },
  sparkLabel: { color: CoachColors.muted, fontSize: 8, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: Spacing.xxxl, padding: Spacing.xl },
  emptyTitle: {
    color: CoachColors.foreground,
    fontSize: FontSize.md,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  emptyBody: {
    color: CoachColors.muted,
    fontSize: FontSize.sm,
    marginTop: 4,
    textAlign: 'center',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.full,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
  },
});
