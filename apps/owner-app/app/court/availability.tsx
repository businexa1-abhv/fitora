import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Court } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import {
  createClosure,
  getCourtCalendar,
  getMyCourts,
  listClosures,
  removeClosure,
} from '@/lib/owner-api';
import { useOwnerCalendarLive } from '@/hooks/use-owner-calendar-live';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

const MAINT_TYPES = [
  { key: 'MAINTENANCE', label: 'Routine Cleaning' },
  { key: 'MAINTENANCE', label: 'Surface Repair' },
  { key: 'MAINTENANCE', label: 'Lighting Adjustment' },
  { key: 'BLOCKED', label: 'Emergency Block' },
] as const;

export default function CourtAvailabilityScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ courtId?: string }>();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedCourtId, setSelectedCourtId] = useState<string | undefined>(
    typeof params.courtId === 'string' ? params.courtId : undefined,
  );
  const [publicBookings, setPublicBookings] = useState(true);
  const [nightIllumination, setNightIllumination] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [maintType, setMaintType] = useState<(typeof MAINT_TYPES)[number]>(MAINT_TYPES[0]);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDate, setMaintDate] = useState(toISODate(new Date()));

  const courtsQuery = useQuery({
    queryKey: ['owner', 'courts'],
    queryFn: () => getMyCourts(token!),
    enabled: !!token,
  });

  const courts = courtsQuery.data?.items ?? [];
  const activeCourtId = selectedCourtId ?? courts[0]?.id;

  const weekEnd = addDays(weekStart, 6);
  const startDate = toISODate(weekStart);
  const endDate = toISODate(weekEnd);

  const calendarQuery = useQuery({
    queryKey: ['owner', 'calendar', activeCourtId, startDate, endDate],
    queryFn: () => getCourtCalendar(token!, activeCourtId!, startDate, endDate),
    enabled: !!token && !!activeCourtId,
  });

  useOwnerCalendarLive(activeCourtId, token);

  const closuresQuery = useQuery({
    queryKey: ['owner', 'closures', activeCourtId],
    queryFn: () => listClosures(token!, activeCourtId!),
    enabled: !!token && !!activeCourtId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createClosure(token!, activeCourtId!, {
        startDate: maintDate,
        endDate: maintDate,
        reason: maintType.key,
        title: maintTitle.trim() || maintType.label,
        isFullDay: true,
      }),
    onSuccess: async () => {
      setModalOpen(false);
      setMaintTitle('');
      await queryClient.invalidateQueries({ queryKey: ['owner', 'closures', activeCourtId] });
      await queryClient.invalidateQueries({ queryKey: ['owner', 'calendar', activeCourtId] });
    },
    onError: (err: Error) => Alert.alert('Could not schedule', err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (closureId: string) => removeClosure(token!, activeCourtId!, closureId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'closures', activeCourtId] });
      await queryClient.invalidateQueries({ queryKey: ['owner', 'calendar', activeCourtId] });
    },
  });

  const days = calendarQuery.data?.days ?? [];
  const weekLabel = `${weekStart.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  })} – ${weekEnd.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;

  const occupancy = useMemo(() => {
    const totals = days.reduce(
      (acc, day) => {
        acc.total += day.totalSlots;
        acc.booked += day.bookedSlots;
        return acc;
      },
      { total: 0, booked: 0 },
    );
    if (totals.total === 0) return 0;
    return Math.round((totals.booked / totals.total) * 100);
  }, [days]);

  const pendingAlerts = (closuresQuery.data ?? []).slice(0, 3);

  function courtStatus(court: Court) {
    if (!court.isActive) {
      return { label: 'MAINTENANCE', color: '#5a3700', bg: '#ffedd5', hint: 'Temporarily offline' };
    }
    if (court.approvalStatus === 'APPROVED') {
      return { label: 'ACTIVE', color: '#006c49', bg: '#d1fae5', hint: 'Optimal condition' };
    }
    return {
      label: court.approvalStatus,
      color: '#464652',
      bg: '#f0f3ff',
      hint: 'Awaiting approval',
    };
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="karate" size={22} color={colors.primary} />
            <Text style={[styles.brand, { color: colors.primary }]}>FitOra Academy</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/(tabs)/notifications')}>
              <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
            </Pressable>
            <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
              <Text style={styles.avatarText}>{(user?.firstName?.[0] ?? 'O').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Court Availability</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Manage bookings and schedule maintenance tasks.
        </Text>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (!activeCourtId) {
              Alert.alert('No court', 'Add a court before scheduling maintenance.');
              return;
            }
            setModalOpen(true);
          }}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Schedule Maintenance</Text>
        </Pressable>

        <View style={styles.legend}>
          {[
            { label: 'Available', color: colors.secondary },
            { label: 'Booked', color: colors.primary },
            { label: 'Maintenance', color: colors.warning },
            { label: 'Blocked', color: colors.danger },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={{ color: colors.muted, fontSize: FontSize.xs }}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Card style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
          <View style={styles.weekHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weekly Schedule</Text>
            <View style={styles.weekNav}>
              <Pressable onPress={() => setWeekStart((d) => addDays(d, -7))} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
              </Pressable>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}>
                {weekLabel}
              </Text>
              <Pressable onPress={() => setWeekStart((d) => addDays(d, 7))} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {courts.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: Spacing.md }}
            >
              <View style={styles.chipRow}>
                {courts.map((court) => {
                  const active = court.id === activeCourtId;
                  return (
                    <Pressable
                      key={court.id}
                      onPress={() => setSelectedCourtId(court.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.primary : colors.mutedBg,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? '#fff' : colors.foreground,
                          fontSize: FontSize.xs,
                          fontWeight: '700',
                        }}
                        numberOfLines={1}
                      >
                        {court.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}

          <QueryState
            isLoading={calendarQuery.isLoading || courtsQuery.isLoading}
            isError={calendarQuery.isError}
            error={calendarQuery.error as Error}
            onRetry={() => calendarQuery.refetch()}
            empty={!activeCourtId}
          >
            <View style={{ gap: Spacing.sm }}>
              {days.map((day) => {
                const weekday = new Date(`${day.date}T12:00:00`).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                });
                const tone = day.hasClosure
                  ? colors.warning
                  : day.bookedSlots > 0
                    ? colors.primary
                    : colors.secondary;
                const label = day.hasClosure
                  ? 'Maint.'
                  : day.bookedSlots > 0
                    ? `${day.bookedSlots} booked`
                    : day.availableSlots > 0
                      ? 'Open'
                      : 'Empty';
                return (
                  <View key={day.date} style={styles.dayRow}>
                    <Text
                      style={{
                        color: colors.muted,
                        fontWeight: '700',
                        width: 72,
                        fontSize: FontSize.sm,
                      }}
                    >
                      {weekday}
                    </Text>
                    <View style={[styles.dayBar, { backgroundColor: colors.mutedBg }]}>
                      <View
                        style={[
                          styles.dayFill,
                          {
                            backgroundColor: tone,
                            width: `${Math.max(
                              12,
                              day.totalSlots
                                ? Math.round(
                                    ((day.bookedSlots + day.blockedSlots) / day.totalSlots) * 100,
                                  )
                                : day.hasClosure
                                  ? 100
                                  : 20,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={{ color: tone, fontSize: FontSize.xs, fontWeight: '800', width: 64 }}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </QueryState>
        </Card>

        <View style={styles.twoCol}>
          <Card style={styles.halfCard}>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>
              Weekly Occupancy
            </Text>
            <Text style={{ color: colors.foreground, fontSize: FontSize.xxl, fontWeight: '800' }}>
              {occupancy}%
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.mutedBg }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.secondary, width: `${Math.min(100, occupancy)}%` },
                ]}
              />
            </View>
          </Card>
          <Card style={styles.halfCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={16} color={colors.warning} />
              <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.sm }}>
                Pending Alerts
              </Text>
            </View>
            {pendingAlerts.length === 0 ? (
              <Text style={{ color: colors.muted, fontSize: FontSize.xs }}>
                No maintenance alerts
              </Text>
            ) : (
              pendingAlerts.map((alert) => (
                <Pressable
                  key={alert.id}
                  onLongPress={() =>
                    Alert.alert('Remove closure?', alert.title, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => removeMutation.mutate(alert.id),
                      },
                    ])
                  }
                  style={[styles.alertItem, { backgroundColor: colors.surfaceContainer }]}
                >
                  <Text
                    style={{ color: colors.foreground, fontWeight: '700', fontSize: FontSize.xs }}
                  >
                    {alert.title}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 10 }}>
                    {alert.reason} · {String(alert.startDate).slice(0, 10)}
                  </Text>
                </Pressable>
              ))
            )}
          </Card>
        </View>

        <Card style={{ padding: Spacing.lg, gap: Spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Academy Mode</Text>
          <View style={styles.toggleRow}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>Public Bookings</Text>
            <Switch
              value={publicBookings}
              onValueChange={setPublicBookings}
              trackColor={{ true: colors.secondary, false: colors.border }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>Night Illumination</Text>
            <Switch
              value={nightIllumination}
              onValueChange={setNightIllumination}
              trackColor={{ true: colors.secondary, false: colors.border }}
            />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: Spacing.md }]}>
          Facility Overview
        </Text>
        <View style={{ gap: Spacing.sm }}>
          {courts.map((court) => {
            const status = courtStatus(court);
            return (
              <Pressable
                key={court.id}
                onPress={() => {
                  setSelectedCourtId(court.id);
                  router.push(`/court/${court.id}`);
                }}
              >
                <Card style={styles.facilityCard}>
                  <View
                    style={[styles.facilityThumb, { backgroundColor: colors.surfaceContainer }]}
                  >
                    <Text style={{ fontSize: 28 }}>🏸</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                      <Text style={{ color: status.color, fontSize: 10, fontWeight: '800' }}>
                        {status.label}
                      </Text>
                    </View>
                    <Text style={{ color: colors.foreground, fontWeight: '800', marginTop: 4 }}>
                      {court.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.xs }}>
                      {status.hint}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        onPress={() => setModalOpen(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Schedule Maintenance
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Court Selection</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {courts.map((court) => {
                  const active = court.id === activeCourtId;
                  return (
                    <Pressable
                      key={court.id}
                      onPress={() => setSelectedCourtId(court.id)}
                      style={[
                        styles.chip,
                        { backgroundColor: active ? colors.primary : colors.mutedBg },
                      ]}
                    >
                      <Text
                        style={{ color: active ? '#fff' : colors.foreground, fontWeight: '700' }}
                      >
                        {court.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Maintenance Type</Text>
            <View style={styles.chipRow}>
              {MAINT_TYPES.map((type) => {
                const active = maintType.label === type.label;
                return (
                  <Pressable
                    key={type.label}
                    onPress={() => setMaintType(type)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.mutedBg,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? '#fff' : colors.foreground,
                        fontSize: FontSize.xs,
                        fontWeight: '700',
                      }}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Title</Text>
            <TextInput
              value={maintTitle}
              onChangeText={setMaintTitle}
              placeholder={maintType.label}
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              Start Date (YYYY-MM-DD)
            </Text>
            <TextInput
              value={maintDate}
              onChangeText={setMaintDate}
              placeholder="2026-07-16"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setModalOpen(false)}
              >
                <Text style={{ color: colors.foreground, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    opacity: createMutation.isPending ? 0.7 : 1,
                  },
                ]}
                disabled={createMutation.isPending || !activeCourtId}
                onPress={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  subtitle: { fontSize: FontSize.sm, marginTop: 4 },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendDot: { borderRadius: Radius.full, height: 8, width: 8 },
  weekHeader: { gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  weekNav: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: Radius.xl,
    maxWidth: 160,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dayRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  dayBar: { borderRadius: Radius.full, flex: 1, height: 10, overflow: 'hidden' },
  dayFill: { height: '100%' },
  twoCol: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  halfCard: { flex: 1, gap: Spacing.sm, padding: Spacing.md },
  progressTrack: { borderRadius: Radius.full, height: 8, overflow: 'hidden' },
  progressFill: { height: '100%' },
  alertHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  alertItem: { borderRadius: Radius.md, gap: 2, padding: Spacing.sm },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  facilityCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  facilityThumb: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 56,
    justifyContent: 'center',
    width: 72,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  fab: {
    alignItems: 'center',
    borderRadius: Radius.full,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 56,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    gap: Spacing.sm,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginTop: Spacing.sm },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  modalBtn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
});
