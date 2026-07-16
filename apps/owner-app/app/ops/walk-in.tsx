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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { useDefaultCourt } from '@/lib/use-default-court';
import { createWalkInBooking, getCourtCalendar } from '@/lib/owner-api';
import { useOwnerCalendarLive } from '@/hooks/use-owner-calendar-live';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const DURATIONS = [60, 90, 120];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function WalkInBookingFormScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const guestParams = useLocalSearchParams<{
    guestName?: string;
    guestPhone?: string;
    guestSport?: string;
  }>();
  const { courtId, court, courts, token } = useDefaultCourt();

  const [playerName, setPlayerName] = useState(guestParams.guestName ?? '');
  const [phone, setPhone] = useState(guestParams.guestPhone ?? '');
  const [selectedCourtId, setSelectedCourtId] = useState<string | undefined>(courtId);
  const [duration, setDuration] = useState(60);
  const [equipment, setEquipment] = useState(false);
  const [payMethod, setPayMethod] = useState<'Cash' | 'UPI' | 'Card'>('UPI');

  useEffect(() => {
    if (guestParams.guestName) setPlayerName(guestParams.guestName);
    if (guestParams.guestPhone) setPhone(guestParams.guestPhone);
  }, [guestParams.guestName, guestParams.guestPhone]);

  const activeCourtId = selectedCourtId ?? courtId;
  const activeCourt = courts.find((c) => c.id === activeCourtId) ?? court;
  const today = toISODate(new Date());

  const calendarQuery = useQuery({
    queryKey: ['owner', 'calendar', activeCourtId, today],
    queryFn: () => getCourtCalendar(token!, activeCourtId!, today, today),
    enabled: !!token && !!activeCourtId,
  });

  useOwnerCalendarLive(activeCourtId, token);

  const openSlots = (calendarQuery.data?.days?.[0]?.slots ?? []).filter(
    (s) => !s.isBlocked && !s.isBooked && (s.availableSeats ?? 1) > 0,
  );
  const [slotId, setSlotId] = useState<string | undefined>();
  const selectedSlot = openSlots.find((s) => s.id === slotId) ?? openSlots[0];

  const base = selectedSlot
    ? Number(selectedSlot.price) || 0
    : Number(activeCourt?.defaultSlotPrice) || 0;
  const durationFactor = duration / 60;
  const equipmentFee = equipment ? 100 : 0;
  const total = Math.round(base * durationFactor + equipmentFee);

  const sports = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courts) {
      if (c.sport?.slug) map.set(c.sport.slug, c.sport.name);
    }
    return Array.from(map.entries());
  }, [courts]);

  const [sportSlug, setSportSlug] = useState<string | undefined>(activeCourt?.sport?.slug);
  const courtsForSport = courts.filter((c) => (sportSlug ? c.sport?.slug === sportSlug : true));

  const walkInMutation = useMutation({
    mutationFn: async () => {
      if (!token || !activeCourtId || !selectedSlot) {
        throw new Error('Select a court and open slot');
      }
      if (!playerName.trim() || !phone.trim()) {
        throw new Error('Enter player name and phone');
      }
      return createWalkInBooking(token, {
        courtId: activeCourtId,
        slotId: selectedSlot.id,
        guestName: playerName.trim(),
        guestPhone: phone.trim(),
        paymentMethod: payMethod,
        equipmentFee,
        notes: duration !== 60 ? `Requested duration ${duration}m` : undefined,
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'calendar', activeCourtId] });
      await queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      const timing = selectedSlot
        ? `${new Date(selectedSlot.startTime).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })} · ${duration}m`
        : `Today · ${duration}m`;
      router.replace({
        pathname: '/ops/walk-in-confirm',
        params: {
          bookingId: result.booking.id,
          name: playerName.trim(),
          phone: phone.trim(),
          court: `${activeCourt?.name ?? 'Court'} (${activeCourt?.sport?.name ?? 'Sport'})`,
          timing,
          amount: String(result.booking.totalAmount ?? total),
          method: payMethod,
          registered: '1',
          checkInCode: result.checkInCode,
          invoiceNumber: result.invoice?.invoiceNumber ?? '',
        },
      });
    },
    onError: (e: Error) => Alert.alert('Walk-in failed', e.message),
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.brand, { color: colors.primary }]}>Quick Entry</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>Walk-in Booking</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Register walk-in players and book courts instantly.
      </Text>

      <Card style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
        <Text style={[styles.section, { color: colors.muted }]}>Player Information</Text>
        <TextInput
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Player Name"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
      </Card>

      <Card style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <Text style={[styles.section, { color: colors.muted }]}>Sport & Court Selection</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {sports.map(([slug, name]) => {
              const active = sportSlug === slug;
              return (
                <Pressable
                  key={slug}
                  onPress={() => {
                    setSportSlug(slug);
                    const first = courts.find((c) => c.sport?.slug === slug);
                    if (first) setSelectedCourtId(first.id);
                  }}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? colors.primary : colors.mutedBg },
                  ]}
                >
                  <Text style={{ color: active ? '#fff' : colors.foreground, fontWeight: '800' }}>
                    {name.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Text style={[styles.label, { color: colors.muted }]}>Available Courts</Text>
        <View style={styles.courtGrid}>
          {courtsForSport.map((c, i) => {
            const active = c.id === activeCourtId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedCourtId(c.id)}
                style={[
                  styles.courtChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: active ? '#fff' : colors.foreground, fontWeight: '800' }}>
                  C-{String(i + 1).padStart(2, '0')}
                </Text>
                <Text
                  style={{
                    color: active ? 'rgba(255,255,255,0.85)' : colors.muted,
                    fontSize: 10,
                  }}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <Text style={[styles.section, { color: colors.muted }]}>Session Duration</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {DURATIONS.map((mins) => {
            const active = duration === mins;
            return (
              <Pressable
                key={mins}
                onPress={() => setDuration(mins)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.mutedBg, flex: 1 },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.foreground,
                    fontWeight: '800',
                    textAlign: 'center',
                  }}
                >
                  {mins} MIN
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.muted }]}>Open Slot</Text>
        {openSlots.length === 0 ? (
          <Text style={{ color: colors.muted }}>No open slots today for this court.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {openSlots.slice(0, 8).map((slot) => {
                const active = (slotId ?? openSlots[0]?.id) === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    onPress={() => setSlotId(slot.id)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.secondary : colors.mutedBg },
                    ]}
                  >
                    <Text style={{ color: active ? '#fff' : colors.foreground, fontWeight: '700' }}>
                      {new Date(slot.startTime).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        <Pressable
          onPress={() => setEquipment((v) => !v)}
          style={[
            styles.equipRow,
            {
              backgroundColor: equipment ? colors.secondaryContainer : colors.mutedBg,
              borderColor: equipment ? colors.secondary : colors.border,
            },
          ]}
        >
          <Ionicons
            name={equipment ? 'checkbox' : 'square-outline'}
            size={18}
            color={equipment ? colors.secondary : colors.muted}
          />
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>
            Equipment rental (+₹100)
          </Text>
        </Pressable>
      </Card>

      <Card style={[styles.summary, { backgroundColor: colors.primary }]}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.lg }}>
          Booking Summary
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', marginTop: 6 }}>
          {(activeCourt?.sport?.name ?? 'Sport') +
            ` · ${activeCourt?.name ?? 'Court'} · ${duration}m`}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Court fee</Text>
          <Text style={{ color: '#fff', fontWeight: '800' }}>
            {formatCurrency(Math.round(base * durationFactor))}
          </Text>
        </View>
        {equipment ? (
          <View style={styles.summaryRow}>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Equipment</Text>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{formatCurrency(equipmentFee)}</Text>
          </View>
        ) : null}
        <View style={[styles.summaryRow, { marginTop: Spacing.sm }]}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.lg }}>Total</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.lg }}>
            {formatCurrency(total)}
          </Text>
        </View>
      </Card>

      <Card style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <Text style={[styles.section, { color: colors.muted }]}>Payment Method</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {(['Cash', 'UPI', 'Card'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setPayMethod(m)}
              style={[
                styles.chip,
                { backgroundColor: payMethod === m ? colors.primary : colors.mutedBg, flex: 1 },
              ]}
            >
              <Text
                style={{
                  color: payMethod === m ? '#fff' : colors.foreground,
                  fontWeight: '800',
                  textAlign: 'center',
                }}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Pressable
        style={[
          styles.confirm,
          {
            backgroundColor: colors.secondary,
            opacity: walkInMutation.isPending || !selectedSlot ? 0.7 : 1,
          },
        ]}
        disabled={walkInMutation.isPending || !selectedSlot}
        onPress={() => walkInMutation.mutate()}
      >
        {walkInMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm Booking</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { fontSize: FontSize.md, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  label: { fontSize: 11, fontWeight: '700', marginTop: Spacing.sm },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  chip: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  courtGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  courtChip: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: '22%',
    padding: Spacing.sm,
  },
  equipRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  summary: { gap: 4, marginTop: Spacing.lg, padding: Spacing.lg },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  confirm: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
});
