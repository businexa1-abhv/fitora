import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { useDefaultCourt } from '@/lib/use-default-court';
import {
  blockSlot,
  closeSlot,
  getCourtCalendar,
  getOwnerBookings,
  openSlot,
  unblockSlot,
  updateSlot,
  type CalendarDay,
  type SlotOperationalState,
} from '@/lib/owner-api';
import { useOwnerCalendarLive } from '@/hooks/use-owner-calendar-live';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type CalendarSlot = CalendarDay['slots'][number];

const STATE_OPTIONS: Array<{ state: SlotOperationalState; label: string }> = [
  { state: 'AVAILABLE', label: 'Open' },
  { state: 'BLOCKED', label: 'Blocked' },
  { state: 'MAINTENANCE', label: 'Maintenance' },
  { state: 'TOURNAMENT', label: 'Tournament' },
  { state: 'PRIVATE', label: 'Private' },
  { state: 'CLOSED', label: 'Closed' },
];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function slotState(slot: CalendarSlot): SlotOperationalState {
  if (slot.operationalState) return slot.operationalState;
  return slot.isBlocked ? 'BLOCKED' : 'AVAILABLE';
}

export default function SlotMasterCalendarScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { courtId, court, token, courts } = useDefaultCourt();
  const [day, setDay] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [sportFilter, setSportFilter] = useState('all');
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [capacityInput, setCapacityInput] = useState('');

  const date = toISODate(day);

  const calendarQuery = useQuery({
    queryKey: ['owner', 'calendar', courtId, date],
    queryFn: () => getCourtCalendar(token!, courtId!, date, date),
    enabled: !!token && !!courtId,
  });

  useOwnerCalendarLive(courtId, token);

  const bookingsQuery = useQuery({
    queryKey: ['owner', 'bookings'],
    queryFn: () => getOwnerBookings(token!),
    enabled: !!token,
  });

  const invalidateCalendar = () =>
    queryClient.invalidateQueries({ queryKey: ['owner', 'calendar', courtId, date] });

  const stateMutation = useMutation({
    mutationFn: ({ slot, state }: { slot: CalendarSlot; state: SlotOperationalState }) => {
      const payload = { expectedVersion: slot.version };
      if (state === 'AVAILABLE') {
        return slotState(slot) === 'CLOSED'
          ? openSlot(token!, slot.id, payload)
          : unblockSlot(token!, slot.id, payload);
      }
      if (state === 'CLOSED') return closeSlot(token!, slot.id, payload);
      return blockSlot(token!, slot.id, { ...payload, reason: state });
    },
    onSuccess: async () => {
      setSelectedSlot(null);
      await invalidateCalendar();
    },
    onError: (e: Error) => Alert.alert('Could not update slot', e.message),
  });

  const editMutation = useMutation({
    mutationFn: ({ slot }: { slot: CalendarSlot }) => {
      const price = Number(priceInput);
      const capacity = Number(capacityInput);
      const payload: { price?: number; capacity?: number; expectedVersion?: number } = {
        expectedVersion: slot.version,
      };
      if (priceInput.trim() && Number.isFinite(price) && price >= 0) payload.price = price;
      if (capacityInput.trim() && Number.isInteger(capacity) && capacity >= 1) {
        payload.capacity = capacity;
      }
      if (payload.price === undefined && payload.capacity === undefined) {
        throw new Error('Enter a valid price or capacity');
      }
      return updateSlot(token!, courtId!, slot.id, payload);
    },
    onSuccess: async () => {
      setSelectedSlot(null);
      await invalidateCalendar();
    },
    onError: (e: Error) => Alert.alert('Could not save slot', e.message),
  });

  function openSlotSheet(slot: CalendarSlot) {
    setPriceInput(String(Number(slot.price) || ''));
    setCapacityInput(String(slot.capacity ?? 1));
    setSelectedSlot(slot);
  }

  const dayData = calendarQuery.data?.days?.[0];
  const slots = dayData?.slots ?? [];
  const bookedToday = useMemo(() => {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    return (bookingsQuery.data?.items ?? []).filter((b) => {
      if (courtId && b.court?.id !== courtId) return false;
      const t = b.slot?.startTime ? new Date(b.slot.startTime).getTime() : 0;
      return t >= start.getTime() && t <= end.getTime();
    });
  }, [bookingsQuery.data, courtId, day]);

  const occupancy =
    dayData && dayData.totalSlots > 0
      ? Math.round((dayData.bookedSlots / dayData.totalSlots) * 100)
      : 0;

  const sportTabs = useMemo(() => {
    const names = new Set(courts.map((c) => c.sport?.name).filter(Boolean) as string[]);
    return ['all', ...Array.from(names)];
  }, [courts]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.brand, { color: colors.primary }]}>Master Calendar</Text>
        <Pressable onPress={() => router.push('/ops/walk-in')} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>Master Calendar</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Manage schedules for {court?.name ?? 'your courts'}.
      </Text>

      <View style={styles.dateNav}>
        <Pressable
          onPress={() =>
            setDay((d) => {
              const n = new Date(d);
              n.setDate(n.getDate() - 1);
              return n;
            })
          }
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={{ color: colors.primary, fontWeight: '800' }}>
          {day.toLocaleDateString('en-IN', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <Pressable
          onPress={() =>
            setDay((d) => {
              const n = new Date(d);
              n.setDate(n.getDate() + 1);
              return n;
            })
          }
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          style={[styles.todayBtn, { backgroundColor: colors.surfaceContainer }]}
          onPress={() => {
            const n = new Date();
            n.setHours(12, 0, 0, 0);
            setDay(n);
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: FontSize.xs }}>
            TODAY
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: Spacing.md }}
      >
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {sportTabs.map((tab) => {
            const active = sportFilter === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setSportFilter(tab)}
                style={[styles.chip, { backgroundColor: active ? colors.primary : colors.mutedBg }]}
              >
                <Text style={{ color: active ? '#fff' : colors.foreground, fontWeight: '700' }}>
                  {tab === 'all' ? 'All Sports' : tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.metrics}>
        <Card style={styles.metric}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>Occupancy</Text>
          <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.xl }}>
            {occupancy}%
          </Text>
        </Card>
        <Card style={styles.metric}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>Bookings</Text>
          <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.xl }}>
            {bookedToday.length}
          </Text>
        </Card>
        <Card style={styles.metric}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>Open slots</Text>
          <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.xl }}>
            {dayData?.availableSlots ?? 0}
          </Text>
        </Card>
      </View>

      <Text style={[styles.section, { color: colors.foreground }]}>Resources · {court?.name}</Text>
      <QueryState
        isLoading={calendarQuery.isLoading}
        isError={calendarQuery.isError}
        error={calendarQuery.error as Error}
        onRetry={() => calendarQuery.refetch()}
        empty={!courtId || slots.length === 0}
      >
        <View style={{ gap: Spacing.sm }}>
          {slots.map((slot) => {
            const booking = bookedToday.find((b) => {
              const st = b.slot?.startTime;
              return st && new Date(st).getTime() === new Date(slot.startTime).getTime();
            });
            const capacity = slot.capacity ?? 1;
            const available = slot.availableSeats ?? (slot.isBooked ? 0 : capacity);
            const fewSpots = slot.availabilityStatus === 'FEW_SPOTS';
            const state = slotState(slot);
            const offline = state !== 'AVAILABLE';
            const tone = offline
              ? colors.warning
              : slot.isBooked || available <= 0
                ? colors.primary
                : fewSpots
                  ? '#E8A317'
                  : colors.secondary;
            const stateLabel = STATE_OPTIONS.find((o) => o.state === state)?.label ?? 'Blocked';
            const statusLabel = offline
              ? stateLabel
              : booking
                ? `${booking.user?.firstName ?? 'Player'} · ${booking.status}`
                : capacity > 1
                  ? `${Math.max(0, capacity - available)}/${capacity} seats · ${formatCurrency(Number(slot.price))}`
                  : slot.isBooked
                    ? 'Booked'
                    : `Available · ${formatCurrency(Number(slot.price))}`;
            return (
              <Pressable key={slot.id} onPress={() => openSlotSheet(slot)}>
                <Card style={styles.slotRow}>
                  <View style={[styles.slotBar, { backgroundColor: tone }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                      {formatHour(slot.startTime)} – {formatHour(slot.endTime)}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {statusLabel}
                    </Text>
                  </View>
                  {offline && !slot.isBooked ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => stateMutation.mutate({ slot, state: 'AVAILABLE' })}
                    >
                      <Text
                        style={{
                          color: colors.secondary,
                          fontWeight: '700',
                          fontSize: FontSize.xs,
                        }}
                      >
                        Open
                      </Text>
                    </Pressable>
                  ) : !slot.isBooked && available > 0 ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => stateMutation.mutate({ slot, state: 'BLOCKED' })}
                    >
                      <Text
                        style={{ color: colors.danger, fontWeight: '700', fontSize: FontSize.xs }}
                      >
                        Block
                      </Text>
                    </Pressable>
                  ) : null}
                </Card>
              </Pressable>
            );
          })}
        </View>
      </QueryState>

      <Modal
        visible={!!selectedSlot}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSlot(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {selectedSlot ? (
              <>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {formatHour(selectedSlot.startTime)} – {formatHour(selectedSlot.endTime)}
                </Text>
                <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                  {STATE_OPTIONS.find((o) => o.state === slotState(selectedSlot))?.label}
                  {selectedSlot.isBooked ? ' · Has bookings' : ''}
                </Text>

                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Slot Status</Text>
                <View style={styles.stateRow}>
                  {STATE_OPTIONS.map((option) => {
                    const active = slotState(selectedSlot) === option.state;
                    return (
                      <Pressable
                        key={option.state}
                        disabled={active || stateMutation.isPending}
                        onPress={() =>
                          stateMutation.mutate({ slot: selectedSlot, state: option.state })
                        }
                        style={[
                          styles.stateChip,
                          { backgroundColor: active ? colors.primary : colors.mutedBg },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? '#fff' : colors.foreground,
                            fontSize: FontSize.xs,
                            fontWeight: '700',
                          }}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.editRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Price</Text>
                    <TextInput
                      value={priceInput}
                      onChangeText={setPriceInput}
                      keyboardType="decimal-pad"
                      placeholder="500"
                      placeholderTextColor={colors.muted}
                      style={[
                        styles.input,
                        { borderColor: colors.border, color: colors.foreground },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Capacity</Text>
                    <TextInput
                      value={capacityInput}
                      onChangeText={setCapacityInput}
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={colors.muted}
                      style={[
                        styles.input,
                        { borderColor: colors.border, color: colors.foreground },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalBtn, { borderColor: colors.border }]}
                    onPress={() => setSelectedSlot(null)}
                  >
                    <Text style={{ color: colors.foreground, fontWeight: '700' }}>Close</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modalBtn,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                        opacity: editMutation.isPending ? 0.7 : 1,
                      },
                    ]}
                    disabled={editMutation.isPending}
                    onPress={() => editMutation.mutate({ slot: selectedSlot })}
                  >
                    {editMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '800' }}>Save Changes</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { fontSize: FontSize.sm, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  dateNav: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  todayBtn: {
    borderRadius: Radius.sm,
    marginLeft: 'auto',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  metrics: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  metric: { flex: 1, gap: 2, padding: Spacing.md },
  section: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  slotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    overflow: 'hidden',
    padding: Spacing.md,
    paddingLeft: 0,
  },
  slotBar: { borderRadius: 2, height: '100%', minHeight: 44, width: 4 },
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
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginTop: Spacing.sm },
  stateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stateChip: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  editRow: { flexDirection: 'row', gap: Spacing.md },
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
