import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { getCourt, getCourtSlots, createBooking } from '@/lib/courts';
import { completePayment } from '@/lib/payments';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function BookingScreen() {
  const { courtId } = useLocalSearchParams<{ courtId: string }>();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const date = todayIso();

  const courtQuery = useQuery({
    queryKey: ['court', courtId],
    queryFn: () => getCourt(courtId!, token ?? undefined),
    enabled: !!courtId,
  });

  const slotsQuery = useQuery({
    queryKey: ['slots', courtId, date],
    queryFn: () => getCourtSlots(courtId!, date),
    enabled: !!courtId,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!token || !courtId || !selectedSlot) throw new Error('Missing booking data');
      const checkout = await createBooking(token, courtId, selectedSlot);
      await completePayment(
        token,
        checkout.payment,
        user?.email ?? '',
        user ? `${user.firstName} ${user.lastName}` : 'Player',
      );
      return checkout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert('Booking confirmed', 'Your slot has been booked successfully.');
    },
    onError: (err: Error) => Alert.alert('Booking failed', err.message),
  });

  const court = courtQuery.data;
  const slots = slotsQuery.data ?? [];
  const selected = slots.find((s) => s.id === selectedSlot);
  const total = selected ? Number(selected.price) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Book a slot" subtitle={court?.name ?? 'Select time'} showBack />

      <QueryState
        isLoading={courtQuery.isLoading || slotsQuery.isLoading}
        isError={courtQuery.isError || slotsQuery.isError}
        error={(courtQuery.error ?? slotsQuery.error) as Error}
        onRetry={() => {
          courtQuery.refetch();
          slotsQuery.refetch();
        }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available slots</Text>
            <Text style={[styles.sectionSub, { color: colors.muted }]}>
              {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>

            <View style={styles.slots}>
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.id;
                const unavailable = slot.isBooked || slot.isBlocked;
                return (
                  <Pressable
                    key={slot.id}
                    disabled={unavailable}
                    onPress={() => setSelectedSlot(slot.id)}
                    style={[
                      styles.slot,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                        opacity: unavailable ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.slotTime, { color: colors.foreground }]}>
                      {formatSlotTime(slot.startTime)} – {formatSlotTime(slot.endTime)}
                    </Text>
                    <Text style={[styles.slotPrice, { color: colors.primary }]}>
                      {formatCurrency(Number(slot.price))}
                    </Text>
                    {unavailable && <Badge label={slot.isBooked ? 'Booked' : 'Blocked'} variant="default" />}
                  </Pressable>
                );
              })}
              {slots.length === 0 && (
                <Text style={[styles.empty, { color: colors.muted }]}>No slots available for today</Text>
              )}
            </View>

            {selected && (
              <Card style={styles.summary}>
                <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Booking summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.muted }]}>Court</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{court?.name}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
                  <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(total)}</Text>
                </View>
              </Card>
            )}
          </View>
        </ScrollView>
      </QueryState>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        <Button
          label={bookMutation.isPending ? 'Processing…' : selected ? `Pay ${formatCurrency(total)}` : 'Select a slot'}
          fullWidth
          disabled={!selected || bookMutation.isPending}
          onPress={() => bookMutation.mutate()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  sectionSub: { fontSize: FontSize.sm, marginBottom: Spacing.lg, marginTop: 4 },
  slots: { gap: Spacing.sm },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  slotTime: { fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  slotPrice: { fontSize: FontSize.md, fontWeight: '800' },
  summary: { marginTop: Spacing.xl },
  summaryTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryLabel: { fontSize: FontSize.sm },
  summaryValue: { fontSize: FontSize.sm, fontWeight: '600' },
  divider: { height: 1, marginVertical: Spacing.md },
  totalLabel: { fontSize: FontSize.lg, fontWeight: '800' },
  totalValue: { fontSize: FontSize.xl, fontWeight: '800' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, borderTopWidth: 1 },
  empty: { textAlign: 'center', paddingVertical: Spacing.xl },
});
