import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EnrollmentStatus } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import {
  createTrainingNote,
  getBatchAttendanceForDate,
  getTrainerBatches,
  markBatchAttendance,
} from '@/lib/trainer-api';
import { todayString } from '@/lib/trainer-utils';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type Mark = 'present' | 'absent' | 'late';

const DEFAULT_DRILLS = [
  { id: '1', title: 'Warm-up (15m)', subtitle: 'Dynamic stretching & jog.', done: true },
  {
    id: '2',
    title: 'Forehand Drills (30m)',
    subtitle: 'Cross-court consistency drills.',
    done: false,
  },
  { id: '3', title: 'Match Play (45m)', subtitle: 'Simulated tie-breakers.', done: false },
];

export default function TrainingSessionDetailScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const date = todayString();

  const [marked, setMarked] = useState<Record<string, Mark>>({});
  const [dirty, setDirty] = useState(false);
  const [notes, setNotes] = useState('');
  const [drills, setDrills] = useState(DEFAULT_DRILLS);

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  const batch = useMemo(
    () => (batchesQuery.data ?? []).find((b) => b.id === batchId),
    [batchesQuery.data, batchId],
  );

  const attendanceQuery = useQuery({
    queryKey: ['trainer', 'attendance', batchId, date],
    queryFn: () => getBatchAttendanceForDate(token!, batchId!, date),
    enabled: !!token && !!batchId,
  });

  useEffect(() => {
    if (!attendanceQuery.data) return;
    const next: Record<string, Mark> = {};
    for (const row of attendanceQuery.data.enrollments) {
      if (row.record) next[row.enrollmentId] = row.record.present ? 'present' : 'absent';
    }
    setMarked(next);
  }, [attendanceQuery.data]);

  const active = batch?.enrollments?.filter((e) => e.status === EnrollmentStatus.ACTIVE) ?? [];
  const presentCount = Object.values(marked).filter((m) => m === 'present' || m === 'late').length;
  const medical = active.find((e) => e.kid?.medicalNotes?.trim());

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !batchId) throw new Error('Missing session');
      const records = active
        .filter((e) => marked[e.id])
        .map((e) => ({
          enrollmentId: e.id,
          present: marked[e.id] !== 'absent',
          notes: marked[e.id] === 'late' ? 'Late' : undefined,
        }));
      if (!records.length) throw new Error('Mark at least one student');
      await markBatchAttendance(token, batchId, { date, records });
      if (notes.trim()) {
        await createTrainingNote(token, {
          batchId,
          title: 'Session notes',
          content: notes.trim(),
          sessionDate: date,
          isPrivate: false,
        });
      }
    },
    onSuccess: async () => {
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ['trainer'] });
      Alert.alert('Saved', 'Attendance and notes saved.');
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  function setMark(id: string, value: Mark) {
    setMarked((prev) => ({ ...prev, [id]: value }));
    setDirty(true);
  }

  if (batchesQuery.isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={CoachColors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={CoachColors.brand} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={styles.brand}>FitOra</Text>
          <Text style={styles.time}>{batch?.schedule || 'Session'}</Text>
        </View>
        {dirty ? (
          <View style={styles.unsaved}>
            <Ionicons name="sync" size={12} color="#fff" />
            <Text style={styles.unsavedText}>Unsaved</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 140,
        }}
      >
        <View style={styles.sessionCard}>
          <View style={styles.sessionTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>{batch?.program?.name ?? batch?.name}</Text>
              <Text style={styles.muted}>
                {batch?.name} · {batch?.program?.court?.name ?? 'Court'}
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>In Progress</Text>
            </View>
          </View>
          {medical?.kid?.medicalNotes ? (
            <View style={styles.medical}>
              <Ionicons name="warning" size={16} color={CoachColors.danger} />
              <Text style={styles.medicalText}>
                Medical Alert: {medical.kid.firstName}: {medical.kid.medicalNotes}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Roster ({active.length})</Text>
          <Text style={styles.muted}>{presentCount} Present</Text>
        </View>

        <View style={{ gap: Spacing.sm }}>
          {active.map((enrollment) => {
            const kid = enrollment.kid;
            const name = kid ? `${kid.firstName} ${kid.lastName}`.trim() : 'Student';
            const initials = name
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const mark = marked[enrollment.id];
            return (
              <View key={enrollment.id} style={styles.rosterCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{name}</Text>
                  {kid?.medicalNotes ? (
                    <Text style={styles.allergy}>{kid.medicalNotes.toUpperCase()}</Text>
                  ) : (
                    <Text style={styles.muted}>Player</Text>
                  )}
                </View>
                <View style={styles.markRow}>
                  <Pressable
                    style={[styles.markBtn, mark === 'present' && styles.markPresent]}
                    onPress={() => setMark(enrollment.id, 'present')}
                  >
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={mark === 'present' ? '#fff' : CoachColors.muted}
                    />
                  </Pressable>
                  <Pressable
                    style={[styles.markBtn, mark === 'late' && styles.markLate]}
                    onPress={() => setMark(enrollment.id, 'late')}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={mark === 'late' ? '#fff' : CoachColors.muted}
                    />
                  </Pressable>
                  <Pressable
                    style={[styles.markBtn, mark === 'absent' && styles.markAbsent]}
                    onPress={() => setMark(enrollment.id, 'absent')}
                  >
                    <Ionicons
                      name="close"
                      size={14}
                      color={mark === 'absent' ? '#fff' : CoachColors.muted}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Training Plan</Text>
        <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
          {drills.map((drill) => (
            <Pressable
              key={drill.id}
              style={styles.drillCard}
              onPress={() =>
                setDrills((prev) =>
                  prev.map((d) => (d.id === drill.id ? { ...d, done: !d.done } : d)),
                )
              }
            >
              <View style={[styles.check, drill.done && styles.checkDone]}>
                {drill.done ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drillTitle}>{drill.title}</Text>
                <Text style={styles.muted}>{drill.subtitle}</Text>
              </View>
              <Ionicons name="timer-outline" size={16} color={CoachColors.muted} />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Coach&apos;s Notes</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          value={notes}
          onChangeText={(v) => {
            setNotes(v);
            setDirty(true);
          }}
          placeholder="Observe footwork and backhand follow-through..."
          placeholderTextColor={CoachColors.muted}
        />

        <Pressable
          style={styles.saveBtn}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Ionicons name="calendar-outline" size={16} color={CoachColors.brand} />
          <Text style={styles.saveText}>
            {saveMutation.isPending ? 'Saving…' : 'Save Attendance'}
          </Text>
        </Pressable>
        <View style={styles.bottomActions}>
          <Pressable
            style={styles.startMini}
            onPress={() => Alert.alert('Session started', 'Timer running for this session.')}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={styles.startMiniText}>Start</Text>
          </Pressable>
          <Pressable
            style={styles.completeBtn}
            onPress={() => {
              saveMutation.mutate(undefined, {
                onSuccess: () => {
                  Alert.alert('Session complete', 'Great work today.', [
                    { text: 'OK', onPress: () => router.back() },
                  ]);
                },
              });
            }}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.completeText}>Complete Session</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: CoachColors.background, flex: 1 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  brand: { color: CoachColors.primary, fontSize: FontSize.md, fontWeight: '800' },
  time: { color: CoachColors.muted, fontSize: FontSize.xs },
  unsaved: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unsavedText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  sessionCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  sessionTop: { flexDirection: 'row', gap: Spacing.md },
  sessionTitle: { color: CoachColors.foreground, fontSize: FontSize.lg, fontWeight: '800' },
  muted: { color: CoachColors.muted, fontSize: FontSize.xs, marginTop: 2 },
  progressBadge: {
    alignSelf: 'flex-start',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressText: { color: CoachColors.primaryContainer, fontSize: 10, fontWeight: '800' },
  medical: {
    alignItems: 'center',
    backgroundColor: CoachColors.softRed,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  medicalText: { color: CoachColors.danger, flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  sectionTitle: { color: CoachColors.brand, fontSize: FontSize.md, fontWeight: '800' },
  rosterCard: {
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
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: { color: CoachColors.primaryContainer, fontSize: FontSize.xs, fontWeight: '800' },
  studentName: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '800' },
  allergy: { color: CoachColors.danger, fontSize: 10, fontWeight: '800', marginTop: 2 },
  markRow: { flexDirection: 'row', gap: 6 },
  markBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.md,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  markPresent: { backgroundColor: CoachColors.primary },
  markLate: { backgroundColor: '#4f6d8e' },
  markAbsent: { backgroundColor: CoachColors.danger },
  drillCard: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  check: {
    alignItems: 'center',
    borderColor: CoachColors.border,
    borderRadius: 6,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkDone: { backgroundColor: CoachColors.primary, borderColor: CoachColors.primary },
  drillTitle: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '800' },
  notesInput: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    color: CoachColors.foreground,
    marginTop: Spacing.md,
    minHeight: 100,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  saveText: { color: CoachColors.brand, fontWeight: '800' },
  bottomActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  startMini: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  startMiniText: { color: '#fff', fontWeight: '800' },
  completeBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.brand,
    borderRadius: Radius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  completeText: { color: '#fff', fontWeight: '800' },
});
