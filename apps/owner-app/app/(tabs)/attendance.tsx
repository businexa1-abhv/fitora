import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnrollmentStatus, type TrainingBatch } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import {
  getBatchAttendanceForDate,
  getTrainerBatches,
  markBatchAttendance,
} from '@/lib/trainer-api';
import { todayString } from '@/lib/trainer-utils';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type MarkedState = Record<string, 'present' | 'absent'>;

function BatchAttendanceCard({
  batch,
  date,
  token,
}: {
  batch: TrainingBatch;
  date: string;
  token: string;
}) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [marked, setMarked] = useState<MarkedState>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const attendanceQuery = useQuery({
    queryKey: ['trainer', 'attendance', batch.id, date],
    queryFn: () => getBatchAttendanceForDate(token, batch.id, date),
  });

  useEffect(() => {
    if (!attendanceQuery.data) return;
    const nextMarked: MarkedState = {};
    const nextNotes: Record<string, string> = {};
    for (const row of attendanceQuery.data.enrollments) {
      if (row.record) {
        nextMarked[row.enrollmentId] = row.record.present ? 'present' : 'absent';
        if (row.record.notes) nextNotes[row.enrollmentId] = row.record.notes;
      }
    }
    setMarked(nextMarked);
    setNotes(nextNotes);
  }, [attendanceQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const active = batch.enrollments?.filter((e) => e.status === EnrollmentStatus.ACTIVE) ?? [];
      const records = active
        .filter((e) => marked[e.id])
        .map((e) => ({
          enrollmentId: e.id,
          present: marked[e.id] === 'present',
          notes: notes[e.id],
        }));
      if (!records.length) throw new Error('Mark at least one student before saving.');
      return markBatchAttendance(token, batch.id, { date, records });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trainer', 'attendance', batch.id, date] });
      void queryClient.invalidateQueries({ queryKey: ['trainer', 'dashboard'] });
    },
  });

  const active = batch.enrollments?.filter((e) => e.status === EnrollmentStatus.ACTIVE) ?? [];

  return (
    <Card style={styles.batchCard}>
      <View style={[styles.batchHeader, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.batchTitle, { color: colors.foreground }]}>{batch.name}</Text>
          <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>{batch.program?.name}</Text>
        </View>
        <Pressable
          disabled={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: saveMutation.isPending ? 0.6 : 1 },
          ]}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      {saveMutation.isError ? (
        <Text style={{ color: colors.danger, fontSize: FontSize.sm, marginTop: Spacing.sm }}>
          {(saveMutation.error as Error).message}
        </Text>
      ) : null}

      {attendanceQuery.isLoading ? (
        <Text style={{ color: colors.muted, marginTop: Spacing.md }}>Loading roster…</Text>
      ) : active.length === 0 ? (
        <Text style={{ color: colors.muted, marginTop: Spacing.md }}>No active enrollments</Text>
      ) : (
        <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
          {active.map((e) => {
            const status = marked[e.id];
            const borderColor =
              status === 'present'
                ? colors.primary
                : status === 'absent'
                  ? colors.danger
                  : colors.border;
            const bgColor =
              status === 'present'
                ? colors.primaryContainer
                : status === 'absent'
                  ? '#fef2f2'
                  : colors.card;
            return (
              <View
                key={e.id}
                style={[styles.studentRow, { borderColor, backgroundColor: bgColor }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: colors.foreground }]}>
                    {e.kid?.firstName} {e.kid?.lastName}
                  </Text>
                  <TextInput
                    placeholder="Notes (optional)"
                    placeholderTextColor={colors.muted}
                    value={notes[e.id] ?? ''}
                    onChangeText={(text) => setNotes((prev) => ({ ...prev, [e.id]: text }))}
                    style={[
                      styles.notesInput,
                      { borderColor: colors.border, color: colors.foreground },
                    ]}
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Pressable
                    onPress={() => setMarked((prev) => ({ ...prev, [e.id]: 'present' }))}
                    style={[
                      styles.toggleBtn,
                      status === 'present'
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.primaryContainer },
                    ]}
                  >
                    <Text
                      style={{
                        color: status === 'present' ? '#fff' : colors.primary,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      Present
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setMarked((prev) => ({ ...prev, [e.id]: 'absent' }))}
                    style={[
                      styles.toggleBtn,
                      status === 'absent'
                        ? { backgroundColor: colors.danger }
                        : { borderColor: colors.border, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={{
                        color: status === 'absent' ? '#fff' : colors.foreground,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      Absent
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

export default function AttendanceScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(todayString());

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Attendance</Text>
      <Text style={{ color: colors.muted, fontSize: FontSize.sm, marginTop: 4 }}>
        Mark daily attendance for your batches
      </Text>

      <View style={[styles.dateRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={{ color: colors.muted, fontSize: FontSize.sm, fontWeight: '700' }}>Date</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          style={[styles.dateInput, { color: colors.foreground }]}
        />
      </View>

      <QueryState
        isLoading={batchesQuery.isLoading}
        isError={batchesQuery.isError}
        error={batchesQuery.error as Error}
        onRetry={() => batchesQuery.refetch()}
      >
        {(batchesQuery.data ?? []).length === 0 ? (
          <Card style={{ marginTop: Spacing.lg }}>
            <Text style={{ color: colors.muted }}>No batches assigned.</Text>
          </Card>
        ) : (
          <View style={{ marginTop: Spacing.lg, gap: Spacing.lg }}>
            {(batchesQuery.data ?? []).map((batch) => (
              <BatchAttendanceCard key={batch.id} batch={batch} date={date} token={token!} />
            ))}
          </View>
        )}
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  dateRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dateInput: { flex: 1, fontSize: FontSize.md, fontWeight: '700', textAlign: 'right' },
  batchCard: { overflow: 'hidden', padding: 0 },
  batchHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  batchTitle: { fontSize: FontSize.md, fontWeight: '800' },
  saveBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  saveBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  studentRow: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  studentName: { fontSize: FontSize.sm, fontWeight: '800' },
  notesInput: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  toggleBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
