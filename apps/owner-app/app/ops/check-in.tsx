import { useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { checkInBooking, getOwnerBookings } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CheckInQrScannerScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [bookingId, setBookingId] = useState('');
  const [checkInCode, setCheckInCode] = useState('');
  const [phone, setPhone] = useState('');
  const [recent, setRecent] = useState<
    Array<{ id: string; name: string; court: string; time: string }>
  >([]);

  const bookingsQuery = useQuery({
    queryKey: ['owner', 'bookings'],
    queryFn: () => getOwnerBookings(token!),
    enabled: !!token,
  });

  const checkInMutation = useMutation({
    mutationFn: () => {
      const id = bookingId.trim();
      const code = checkInCode.trim();
      if (!id) throw new Error('Enter booking ID');
      if (!code) throw new Error('Enter check-in code');
      return checkInBooking(token!, id, code);
    },
    onSuccess: async () => {
      const booking = (bookingsQuery.data?.items ?? []).find((b) => b.id === bookingId.trim());
      const name =
        `${booking?.user?.firstName ?? ''} ${booking?.user?.lastName ?? ''}`.trim() || 'Player';
      setRecent((prev) =>
        [
          {
            id: bookingId.trim(),
            name,
            court: booking?.court?.name ?? 'Court',
            time: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          ...prev,
        ].slice(0, 8),
      );
      setCheckInCode('');
      await queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      router.push({
        pathname: '/ops/check-in-success',
        params: {
          bookingId: bookingId.trim(),
          name,
          court: booking?.court?.name ?? 'Court',
          time: booking?.slot?.startTime
            ? new Date(booking.slot.startTime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      });
    },
    onError: (e: Error) => Alert.alert('Check-in failed', e.message),
  });

  const todayBookings = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return (bookingsQuery.data?.items ?? [])
      .filter((b) => {
        const t = b.slot?.startTime ? new Date(b.slot.startTime).getTime() : 0;
        return t >= start.getTime() && t <= end.getTime();
      })
      .filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED')
      .slice(0, 12);
  }, [bookingsQuery.data]);

  const phoneMatches = useMemo(() => {
    const q = phone.trim().toLowerCase();
    if (!q) return [];
    return (bookingsQuery.data?.items ?? [])
      .filter((b) => {
        const name = `${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.toLowerCase();
        return name.includes(q) || b.id.toLowerCase().includes(q);
      })
      .slice(0, 5);
  }, [bookingsQuery.data, phone]);

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
        <Text style={[styles.brand, { color: colors.primary }]}>Player Check-in</Text>
        <Pressable onPress={() => router.push('/ops/check-in-scanner')} hitSlop={8}>
          <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/ops/check-in-scanner')}>
        <Card style={[styles.scannerCard, { backgroundColor: colors.primaryContainer }]}>
          <Ionicons name="qr-code-outline" size={72} color="#fff" />
          <Text
            style={{ color: '#fff', fontWeight: '800', marginTop: Spacing.md, textAlign: 'center' }}
          >
            Open QR scanner
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center' }}>
            Tap to scan, or continue with manual check-in below.
          </Text>
        </Card>
      </Pressable>

      <Text style={[styles.section, { color: colors.foreground }]}>Manual Check-in</Text>
      <Card style={{ gap: Spacing.sm }}>
        <Text style={[styles.label, { color: colors.muted }]}>Search player / booking</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Name or booking ID"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        {phoneMatches.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => {
              setBookingId(b.id);
              setPhone(`${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim());
            }}
            style={[styles.matchRow, { backgroundColor: colors.surfaceContainer }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>
              {`${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim() || 'Player'}
            </Text>
            <Text style={{ color: colors.muted, fontSize: FontSize.xs }}>
              {b.court?.name} · {b.id.slice(0, 8)}…
            </Text>
          </Pressable>
        ))}

        <Text style={[styles.label, { color: colors.muted }]}>Booking ID</Text>
        <TextInput
          value={bookingId}
          onChangeText={setBookingId}
          placeholder="#BK-…"
          autoCapitalize="none"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Check-in Code</Text>
        <TextInput
          value={checkInCode}
          onChangeText={setCheckInCode}
          placeholder="ABC123"
          autoCapitalize="characters"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          disabled={checkInMutation.isPending}
          onPress={() => checkInMutation.mutate()}
        >
          {checkInMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm Check-in</Text>
            </>
          )}
        </Pressable>
      </Card>

      <Text style={[styles.section, { color: colors.foreground }]}>Today&apos;s Bookings</Text>
      <QueryState
        isLoading={bookingsQuery.isLoading}
        isError={bookingsQuery.isError}
        error={bookingsQuery.error as Error}
        onRetry={() => bookingsQuery.refetch()}
        empty={todayBookings.length === 0}
      >
        <View style={{ gap: Spacing.sm }}>
          {todayBookings.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setBookingId(b.id)}
              style={[
                styles.bookingRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                  {`${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim() || 'Player'}
                </Text>
                <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                  {b.court?.name} · {b.status}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </QueryState>

      {recent.length > 0 ? (
        <>
          <Text style={[styles.section, { color: colors.foreground }]}>Recent Check-ins</Text>
          <View style={{ gap: Spacing.sm }}>
            {recent.map((item) => (
              <Card key={`${item.id}-${item.time}`} style={styles.recentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '800' }}>{item.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>{item.court}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                  <Text style={{ color: colors.secondary, fontSize: 10, fontWeight: '800' }}>
                    CHECKED IN
                  </Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: FontSize.xs }}>{item.time}</Text>
              </Card>
            ))}
          </View>
        </>
      ) : null}
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
  scannerCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    padding: Spacing.xxl,
  },
  scannerActions: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.lg },
  scanBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  section: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  label: { fontSize: 11, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  matchRow: { borderRadius: Radius.md, gap: 2, padding: Spacing.md },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  bookingRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    padding: Spacing.md,
  },
  recentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  badge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
});
