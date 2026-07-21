import { useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { BookingTypeBadge, StatusBadge } from '@/components/status-badge';
import {
  cancelOwnerBooking,
  checkInBooking,
  getBookingDetail,
  getBookingQr,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { getStatusMeta } from '@/lib/booking-status';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSlot(start: string, end: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatFullDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatMoney(amount?: string | number) {
  if (amount == null) return '—';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function getInitials(user?: { firstName?: string; lastName?: string; email?: string }) {
  if (!user) return '?';
  const f = (user.firstName?.[0] ?? '').toUpperCase();
  const l = (user.lastName?.[0] ?? '').toUpperCase();
  return f + l || user.email?.[0]?.toUpperCase() || '?';
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: colors.mutedBg }]}>
        <Ionicons name={icon} size={14} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookingDetailScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [cancelReason, setCancelReason] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────────
  const detailQuery = useQuery({
    queryKey: ['owner', 'booking', id],
    queryFn: () => getBookingDetail(token!, id),
    enabled: !!token && !!id,
  });

  const booking = detailQuery.data;
  const status = booking?.status ?? '';

  const qrQuery = useQuery({
    queryKey: ['owner', 'booking', id, 'qr'],
    queryFn: () => getBookingQr(token!, id),
    enabled: !!token && !!id && (status === 'CONFIRMED' || status === 'PENDING'),
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const checkInMutation = useMutation({
    mutationFn: () => {
      const code = qrQuery.data?.checkInCode;
      if (!code) throw new Error('Check-in code not available. Please try refreshing.');
      return checkInBooking(token!, id, code);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['owner', 'booking', id] });
      Alert.alert('Checked In ✓', 'Player has been successfully checked in.');
    },
    onError: (e: Error) => Alert.alert('Check-in Failed', e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOwnerBooking(token!, id, cancelReason || 'Cancelled by owner'),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['owner', 'booking', id] });
      Alert.alert(
        'Booking Cancelled',
        res.refundAmount > 0
          ? `A refund of ${formatMoney(res.refundAmount)} (${res.refundPercent}%) will be processed.`
          : 'No refund applicable for this cancellation.',
      );
      router.back();
    },
    onError: (e: Error) => Alert.alert('Cancellation Failed', e.message),
  });

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      [
        { text: 'Go Back', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ],
    );
  };

  const handleContact = () => {
    const phone = booking?.user?.phone;
    const email = booking?.user?.email;
    if (phone) {
      void Linking.openURL(`tel:${phone}`);
    } else if (email) {
      void Linking.openURL(`mailto:${email}`);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (detailQuery.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.topBar,
            { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>Booking Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={{ color: colors.muted }}>Loading booking…</Text>
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.topBar,
            { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>Booking Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={{ color: colors.danger }}>Booking not found.</Text>
        </View>
      </View>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────────
  const canCheckIn = status === 'CONFIRMED';
  const canCancel = status === 'CONFIRMED' || status === 'PENDING';
  const hasContact = !!(booking.user?.phone || booking.user?.email);

  const playerName = booking.user
    ? `${booking.user.firstName ?? ''} ${booking.user.lastName ?? ''}`.trim() ||
      booking.user.email ||
      'Guest'
    : 'Guest';

  const initials = getInitials(booking.user);
  const statusMeta = getStatusMeta(status);

  const slotLabel = booking.slot ? formatSlot(booking.slot.startTime, booking.slot.endTime) : '—';
  const dateLabel = booking.slot?.startTime ? formatFullDate(booking.slot.startTime) : '—';

  const duration = booking.slot
    ? Math.round(
        (new Date(booking.slot.endTime).getTime() - new Date(booking.slot.startTime).getTime()) /
          60000,
      )
    : 0;

  const qr = qrQuery.data;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Fixed back header */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Booking Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: Spacing.md,
        }}
      >
        {/* ── Status banner ── */}
        <Card style={[styles.statusBanner, { borderColor: statusMeta.color }]}>
          <View style={styles.statusRow}>
            <Text style={[styles.bookingIdLarge, { color: colors.muted }]}>
              #{id.slice(0, 10).toUpperCase()}
            </Text>
            <StatusBadge status={status} />
          </View>
          {booking.bookingType ? (
            <View style={{ marginTop: Spacing.xs }}>
              <BookingTypeBadge type={booking.bookingType} />
            </View>
          ) : null}
        </Card>

        {/* ── Player card ── */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>PLAYER</Text>
          <View style={styles.playerRow}>
            <View style={[styles.avatarLg, { backgroundColor: colors.primaryContainer }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
                {playerName}
              </Text>
              {booking.user?.email ? (
                <Text style={[styles.playerSub, { color: colors.muted }]} numberOfLines={1}>
                  {booking.user.email}
                </Text>
              ) : null}
              {booking.user?.phone ? (
                <Pressable onPress={handleContact} style={styles.phoneRow}>
                  <Ionicons name="call-outline" size={13} color={colors.primary} />
                  <Text style={[styles.playerSub, { color: colors.primary }]}>
                    {booking.user.phone}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Card>

        {/* ── Slot / booking info card ── */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>BOOKING INFO</Text>
          <View style={styles.infoList}>
            {booking.court?.name ? (
              <InfoRow icon="tennisball-outline" label="Court" value={booking.court.name} />
            ) : null}
            {booking.court?.sportType ? (
              <InfoRow icon="fitness-outline" label="Sport" value={booking.court.sportType} />
            ) : null}
            <InfoRow icon="calendar-outline" label="Date" value={dateLabel} />
            <InfoRow icon="time-outline" label="Time" value={slotLabel} />
            {duration > 0 ? (
              <InfoRow icon="hourglass-outline" label="Duration" value={`${duration} minutes`} />
            ) : null}
            {(booking.seats ?? 1) > 1 ? (
              <InfoRow icon="people-outline" label="Seats" value={String(booking.seats)} />
            ) : null}
            {booking.notes ? (
              <InfoRow icon="document-text-outline" label="Notes" value={booking.notes} />
            ) : null}
          </View>
        </Card>

        {/* ── Payment card ── */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>PAYMENT</Text>
          <View style={styles.infoList}>
            <InfoRow icon="cash-outline" label="Amount" value={formatMoney(booking.totalAmount)} />
            {booking.paymentStatus ? (
              <InfoRow
                icon="checkmark-circle-outline"
                label="Payment Status"
                value={booking.paymentStatus}
                valueColor={
                  booking.paymentStatus === 'PAID'
                    ? '#006c49'
                    : booking.paymentStatus === 'PENDING'
                      ? '#92400e'
                      : booking.paymentStatus === 'REFUNDED'
                        ? '#6b7280'
                        : undefined
                }
              />
            ) : null}
            {booking.bookingSource ? (
              <InfoRow
                icon="swap-horizontal-outline"
                label="Source"
                value={
                  booking.bookingSource === 'OWNER_WALK_IN' ? 'Walk-in (On-site)' : 'Player App'
                }
              />
            ) : null}
          </View>
        </Card>

        {/* ── QR Code ── */}
        {qr ? (
          <Card style={styles.qrCard}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>CHECK-IN QR CODE</Text>
            <View style={styles.qrWrap}>
              <Image
                source={{ uri: qr.qrCodeDataUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.codeBox, { backgroundColor: colors.mutedBg }]}>
              <Text style={[styles.codeText, { color: colors.foreground }]}>{qr.checkInCode}</Text>
            </View>
          </Card>
        ) : null}

        {/* ── Action buttons ── */}
        <View style={styles.actions}>
          {canCheckIn && (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: colors.secondary,
                  opacity: pressed || checkInMutation.isPending ? 0.7 : 1,
                },
              ]}
              onPress={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>
                {checkInMutation.isPending ? 'Checking in…' : 'Check In Player'}
              </Text>
            </Pressable>
          )}
          {canCancel && (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtnOutline,
                {
                  borderColor: colors.danger,
                  opacity: pressed || cancelMutation.isPending ? 0.7 : 1,
                },
              ]}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
              <Text style={[styles.actionBtnOutlineText, { color: colors.danger }]}>
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Booking'}
              </Text>
            </Pressable>
          )}
          {hasContact && (
            <Pressable
              style={({ pressed }) => [styles.actionBtnGhost, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleContact}
            >
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={[styles.actionBtnGhostText, { color: colors.primary }]}>
                Contact Player
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: Spacing.sm,
    width: 40,
  },
  topTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },

  // Center state
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Status banner
  statusBanner: {
    borderWidth: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingIdLarge: {
    fontFamily: 'Courier',
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Player card
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarLg: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  playerName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  playerSub: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },

  // Info list
  infoList: {
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: FontSize.xs,
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginTop: 1,
  },

  // QR
  qrCard: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  qrWrap: {
    padding: Spacing.sm,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  codeBox: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
  },

  // Action buttons
  actions: {
    gap: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  actionBtnOutlineText: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  actionBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  actionBtnGhostText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
