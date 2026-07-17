import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LeaveRequestStatus } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { QueryState } from '@/components/ui';
import {
  cancelLeaveRequest,
  createLeaveRequest,
  getTrainerSchedule,
  listLeaveRequests,
} from '@/lib/trainer-api';
import { todayString } from '@/lib/trainer-utils';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type HistoryFilter = 'Pending' | 'Approved' | 'Rejected';

function daysBetween(start: string, end: string) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

export default function CoachLeaveRequestsScreen() {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState(todayString());
  const [reason, setReason] = useState('Annual Leave');
  const [filter, setFilter] = useState<HistoryFilter>('Pending');

  const leaveQuery = useQuery({
    queryKey: ['trainer', 'leave'],
    queryFn: () => listLeaveRequests(token!),
    enabled: !!token,
  });

  const scheduleQuery = useQuery({
    queryKey: ['trainer', 'schedule'],
    queryFn: async () => (await getTrainerSchedule(token!)).items,
    enabled: !!token,
  });

  const approvedDays = useMemo(
    () =>
      (leaveQuery.data ?? [])
        .filter((l) => l.status === LeaveRequestStatus.APPROVED)
        .reduce((sum, l) => sum + daysBetween(l.startDate, l.endDate), 0),
    [leaveQuery.data],
  );
  const remaining = Math.max(0, 12 - approvedDays);

  const conflict = useMemo(() => {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return null;
    const day = start.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const hit = (scheduleQuery.data ?? []).find((item) =>
      item.schedule.toLowerCase().includes(day.slice(0, 3)),
    );
    return hit ?? null;
  }, [scheduleQuery.data, startDate]);

  const filtered = (leaveQuery.data ?? []).filter((l) => {
    if (filter === 'Pending') return l.status === LeaveRequestStatus.PENDING;
    if (filter === 'Approved') return l.status === LeaveRequestStatus.APPROVED;
    return l.status === LeaveRequestStatus.REJECTED;
  });

  const submitMutation = useMutation({
    mutationFn: () => createLeaveRequest(token!, { startDate, endDate, reason }),
    onSuccess: async () => {
      setReason('Annual Leave');
      await queryClient.invalidateQueries({ queryKey: ['trainer', 'leave'] });
      Alert.alert('Submitted', 'Leave request sent for approval.');
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(token!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['trainer', 'leave'] }),
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={CoachColors.brand} />
        </Pressable>
        <Text style={styles.title}>Leave Requests</Text>
        <View style={styles.topRight}>
          <Pressable onPress={() => router.push('/coach/notifications' as never)}>
            <Ionicons name="notifications-outline" size={20} color={CoachColors.muted} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.firstName?.[0] ?? 'C').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xxxl,
        }}
      >
        <View style={styles.balanceCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>Leave Balance</Text>
            <Text style={styles.balanceValue}>{remaining} Days remaining</Text>
            <Text style={styles.muted}>Valid until Dec 31, {new Date().getFullYear()}</Text>
          </View>
          <View style={styles.balanceIcon}>
            <Ionicons name="calendar" size={18} color={CoachColors.brand} />
          </View>
        </View>

        {conflict ? (
          <View style={styles.conflict}>
            <Ionicons name="warning" size={16} color={CoachColors.danger} />
            <Text style={styles.conflictText}>
              Conflict: You have a session on {startDate} — {conflict.batchName} (
              {conflict.schedule})
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>New Request</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Ionicons name="calendar-outline" size={14} color={CoachColors.muted} />
            <TextInput
              style={styles.dateInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={CoachColors.muted}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.dateField}>
            <Ionicons name="calendar-outline" size={14} color={CoachColors.muted} />
            <TextInput
              style={styles.dateInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={CoachColors.muted}
              autoCapitalize="none"
            />
          </View>
        </View>
        <Pressable
          style={styles.reasonField}
          onPress={() =>
            setReason((r) =>
              r === 'Annual Leave'
                ? 'Sick Leave'
                : r === 'Sick Leave'
                  ? 'Professional Training'
                  : 'Annual Leave',
            )
          }
        >
          <Text style={styles.reasonText}>{reason}</Text>
          <Ionicons name="chevron-down" size={16} color={CoachColors.muted} />
        </Pressable>
        <Pressable
          style={styles.submitBtn}
          onPress={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
        >
          <Text style={styles.submitText}>
            {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
          </Text>
        </Pressable>

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>History</Text>
          <Text style={styles.link}>View All</Text>
        </View>
        <View style={styles.filterRow}>
          {(['Pending', 'Approved', 'Rejected'] as HistoryFilter[]).map((chip) => {
            const active = filter === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => setFilter(chip)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{chip}</Text>
              </Pressable>
            );
          })}
        </View>

        <QueryState
          isLoading={leaveQuery.isLoading}
          isError={leaveQuery.isError}
          error={leaveQuery.error as Error}
          onRetry={() => leaveQuery.refetch()}
        >
          <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
            {filtered.length === 0 ? (
              <Text style={styles.muted}>No {filter.toLowerCase()} requests.</Text>
            ) : (
              filtered.map((item) => {
                const days = daysBetween(item.startDate, item.endDate);
                const status = item.status;
                return (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyTop}>
                      <Text style={styles.historyTitle}>{item.reason || 'Leave'}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              status === LeaveRequestStatus.APPROVED
                                ? '#e8eef5'
                                : status === LeaveRequestStatus.REJECTED
                                  ? CoachColors.softRed
                                  : CoachColors.softOrange,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color:
                              status === LeaveRequestStatus.APPROVED
                                ? '#3d5a80'
                                : status === LeaveRequestStatus.REJECTED
                                  ? CoachColors.danger
                                  : CoachColors.primaryContainer,
                            fontSize: 10,
                            fontWeight: '800',
                          }}
                        >
                          {status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.muted}>
                      {item.startDate} - {item.endDate} ({days} days)
                    </Text>
                    {status === LeaveRequestStatus.PENDING ? (
                      <Pressable
                        style={styles.cancelBtn}
                        onPress={() => cancelMutation.mutate(item.id)}
                      >
                        <Ionicons name="close" size={14} color={CoachColors.danger} />
                        <Text style={styles.cancelText}>Cancel</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { color: CoachColors.brand, fontSize: FontSize.xl, fontWeight: '800' },
  topRight: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  avatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.primaryContainer,
    borderRadius: Radius.full,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  balanceCard: {
    backgroundColor: CoachColors.softOrange,
    borderLeftColor: CoachColors.brand,
    borderLeftWidth: 4,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    padding: Spacing.lg,
  },
  balanceLabel: { color: CoachColors.muted, fontSize: FontSize.xs, fontWeight: '700' },
  balanceValue: {
    color: CoachColors.brand,
    fontSize: FontSize.xl,
    fontWeight: '800',
    marginTop: 4,
  },
  muted: { color: CoachColors.muted, fontSize: FontSize.xs, marginTop: 2 },
  balanceIcon: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  conflict: {
    alignItems: 'flex-start',
    backgroundColor: CoachColors.softRed,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  conflictText: { color: CoachColors.danger, flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  sectionTitle: {
    color: CoachColors.brand,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginTop: Spacing.xl,
  },
  dateRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  dateField: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
  },
  dateInput: {
    color: CoachColors.foreground,
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
    paddingVertical: Spacing.md,
  },
  reasonField: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  reasonText: { color: CoachColors.foreground, fontWeight: '700' },
  submitBtn: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
  },
  submitText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    color: CoachColors.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginTop: Spacing.xl,
  },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  filterChip: {
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: CoachColors.brand },
  filterText: { color: CoachColors.brand, fontSize: FontSize.sm, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  historyCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  historyTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  historyTitle: { color: CoachColors.foreground, fontSize: FontSize.md, fontWeight: '800' },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  cancelBtn: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    marginTop: Spacing.sm,
  },
  cancelText: { color: CoachColors.danger, fontSize: FontSize.xs, fontWeight: '800' },
});
