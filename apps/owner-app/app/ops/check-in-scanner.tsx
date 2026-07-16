import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { checkInBooking, getOwnerBookings } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type ParsedQr = { bookingId: string; checkInCode: string };

function parseCheckInPayload(raw: string): ParsedQr | null {
  const trimmed = raw.trim();
  try {
    const data = JSON.parse(trimmed) as {
      type?: string;
      bookingId?: string;
      checkInCode?: string;
    };
    if (data.type === 'fitora_booking_checkin' && data.bookingId && data.checkInCode) {
      return { bookingId: data.bookingId, checkInCode: data.checkInCode };
    }
  } catch {
    // fall through — allow "bookingId|checkInCode"
  }
  if (trimmed.includes('|')) {
    const [bookingId, checkInCode] = trimmed.split('|');
    if (bookingId && checkInCode)
      return { bookingId: bookingId.trim(), checkInCode: checkInCode.trim() };
  }
  return null;
}

export default function QrCheckInScannerActiveScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualId, setManualId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const scanningLock = useRef(false);

  const bookingsQuery = useQuery({
    queryKey: ['owner', 'bookings'],
    queryFn: () => getOwnerBookings(token!),
    enabled: !!token,
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ bookingId, checkInCode }: ParsedQr) => {
      if (!token) throw new Error('Not signed in');
      return checkInBooking(token, bookingId, checkInCode);
    },
    onSuccess: async (_result, vars) => {
      const booking = (bookingsQuery.data?.items ?? []).find((b) => b.id === vars.bookingId);
      const name =
        `${booking?.user?.firstName ?? ''} ${booking?.user?.lastName ?? ''}`.trim() || 'Player';
      await queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      router.replace({
        pathname: '/ops/check-in-success',
        params: {
          bookingId: vars.bookingId,
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
    onError: (e: Error) => {
      scanningLock.current = false;
      Alert.alert('Check-in failed', e.message);
    },
  });

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanningLock.current || checkInMutation.isPending) return;
      const parsed = parseCheckInPayload(result.data);
      if (!parsed) return;
      scanningLock.current = true;
      checkInMutation.mutate(parsed);
    },
    [checkInMutation],
  );

  const submitManual = () => {
    const bookingId = manualId.trim();
    const checkInCode = manualCode.trim();
    if (!bookingId || !checkInCode) {
      Alert.alert('Missing', 'Enter booking ID and check-in code');
      return;
    }
    checkInMutation.mutate({ bookingId, checkInCode });
  };

  if (!permission) {
    return <View style={[styles.root, { backgroundColor: colors.primaryContainer }]} />;
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.primaryContainer,
            paddingTop: insets.top,
            justifyContent: 'center',
            paddingHorizontal: Spacing.xl,
          },
        ]}
      >
        <Text
          style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.lg, textAlign: 'center' }}
        >
          Camera permission is required to scan booking QR codes.
        </Text>
        <Pressable
          style={[styles.checkBtn, { backgroundColor: colors.card, marginTop: Spacing.lg }]}
          onPress={() => void requestPermission()}
        >
          <Text style={{ color: colors.primary, fontWeight: '800' }}>Allow Camera</Text>
        </Pressable>
        <Pressable style={{ marginTop: Spacing.md }} onPress={() => router.back()}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.primaryContainer, paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>QR Check-in</Text>
        <Pressable onPress={() => setTorch((v) => !v)} hitSlop={8}>
          <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.frameWrap}>
        <View style={styles.cameraBox}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onBarcodeScanned}
          />
          <View style={styles.frameOverlay} pointerEvents="none">
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          {checkInMutation.isPending ? (
            <View style={styles.scanning}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700' }}>Checking in…</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.hint}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
            Align FitOra booking QR within frame
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.manual,
          { backgroundColor: colors.card, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>MANUAL ENTRY</Text>
        <TextInput
          value={manualId}
          onChangeText={setManualId}
          placeholder="Booking ID"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <View style={styles.row}>
          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Check-in code"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.foreground, flex: 1 },
            ]}
          />
          <Pressable
            style={[styles.checkBtn, { backgroundColor: colors.primary }]}
            disabled={checkInMutation.isPending}
            onPress={submitManual}
          >
            {checkInMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '800' }}>Check In</Text>
            )}
          </Pressable>
        </View>
        <View style={styles.footerActions}>
          <Pressable style={styles.footerBtn} onPress={() => router.push('/ops/check-in')}>
            <Ionicons name="time-outline" size={22} color={colors.primary} />
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800' }}>HISTORY</Text>
          </Pressable>
          <Pressable
            style={styles.footerBtn}
            onPress={() => Alert.alert('Support', 'Contact FitOra support for check-in issues.')}
          >
            <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800' }}>SUPPORT</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  frameWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  cameraBox: {
    borderRadius: Radius.lg,
    height: 260,
    overflow: 'hidden',
    width: 260,
  },
  frameOverlay: { ...StyleSheet.absoluteFillObject },
  corner: {
    borderColor: '#34d399',
    height: 28,
    position: 'absolute',
    width: 28,
  },
  tl: { borderLeftWidth: 4, borderTopWidth: 4, left: 8, top: 8 },
  tr: { borderRightWidth: 4, borderTopWidth: 4, right: 8, top: 8 },
  bl: { borderBottomWidth: 4, borderLeftWidth: 4, bottom: 8, left: 8 },
  br: { borderBottomWidth: 4, borderRightWidth: 4, bottom: 8, right: 8 },
  scanning: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 8,
    justifyContent: 'center',
  },
  hint: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radius.xl,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  manual: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  checkBtn: {
    alignItems: 'center',
    borderRadius: Radius.md,
    justifyContent: 'center',
    minWidth: 100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: Spacing.md,
  },
  footerBtn: { alignItems: 'center', gap: 4 },
});
