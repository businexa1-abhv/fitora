import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { useDefaultCourt } from '@/lib/use-default-court';
import { getCourtCalendar, getOwnerBookings, updateSlot } from '@/lib/owner-api';
import { useOwnerCalendarLive } from '@/hooks/use-owner-calendar-live';
import { FontSize, Radius, Spacing } from '@/constants/theme';

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

  const blockMutation = useMutation({
    mutationFn: (slotId: string) => updateSlot(token!, courtId!, slotId, { isBlocked: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'calendar', courtId, date] });
    },
    onError: (e: Error) => Alert.alert('Could not block slot', e.message),
  });

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
            const tone = slot.isBlocked
              ? colors.warning
              : slot.isBooked || available <= 0
                ? colors.primary
                : fewSpots
                  ? '#E8A317'
                  : colors.secondary;
            const statusLabel = slot.isBlocked
              ? 'Blocked / Maintenance'
              : booking
                ? `${booking.user?.firstName ?? 'Player'} · ${booking.status}`
                : capacity > 1
                  ? `${Math.max(0, capacity - available)}/${capacity} seats · ${formatCurrency(Number(slot.price))}`
                  : slot.isBooked
                    ? 'Booked'
                    : `Available · ${formatCurrency(Number(slot.price))}`;
            return (
              <Card key={slot.id} style={styles.slotRow}>
                <View style={[styles.slotBar, { backgroundColor: tone }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                    {formatHour(slot.startTime)} – {formatHour(slot.endTime)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>{statusLabel}</Text>
                </View>
                {!slot.isBlocked && !slot.isBooked && available > 0 ? (
                  <Pressable onPress={() => blockMutation.mutate(slot.id)}>
                    <Text
                      style={{ color: colors.danger, fontWeight: '700', fontSize: FontSize.xs }}
                    >
                      Block
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            );
          })}
        </View>
      </QueryState>
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
});
