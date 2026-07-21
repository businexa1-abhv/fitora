import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import CameraView from 'expo-camera/build/CameraView';
import CameraManager from 'expo-camera/build/ExpoCameraManager';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { getTrainerBatches, markEnrollmentAttendance } from '@/lib/trainer-api';
import { todayString } from '@/lib/trainer-utils';
import { FitoraLoader } from '@/components/fitora-loader';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type BarcodeScanningResult = { data: string };
type CameraPermission = { granted: boolean };

function parseStudentQr(raw: string): string | null {
  const trimmed = raw.trim();
  try {
    const data = JSON.parse(trimmed) as {
      type?: string;
      enrollmentId?: string;
      kidId?: string;
      studentId?: string;
    };
    if (data.type === 'fitora_student_attendance' || data.type === 'fitora_training_checkin') {
      return data.enrollmentId ?? data.kidId ?? data.studentId ?? null;
    }
    if (data.enrollmentId) return data.enrollmentId;
  } catch {
    // plain id
  }
  if (trimmed.length >= 8) return trimmed;
  return null;
}

export default function QrAttendanceScannerScreen() {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<CameraPermission | null>(null);
  const [torch, setTorch] = useState(false);
  const [manualId, setManualId] = useState('');
  const [status, setStatus] = useState('');
  const scanningLock = useRef(false);

  const requestPermission = useCallback(async () => {
    const result = (await CameraManager.requestCameraPermissionsAsync()) as CameraPermission;
    setPermission(result);
    return result;
  }, []);

  useEffect(() => {
    let mounted = true;
    CameraManager.getCameraPermissionsAsync()
      .then((result: CameraPermission) => {
        if (mounted) setPermission(result);
      })
      .catch(() => {
        if (mounted) setPermission({ granted: false });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches', 'students'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  const resolveEnrollmentId = useCallback(
    (rawId: string) => {
      const batches = batchesQuery.data ?? [];
      for (const batch of batches) {
        for (const enrollment of batch.enrollments ?? []) {
          if (
            enrollment.id === rawId ||
            enrollment.kidId === rawId ||
            enrollment.kid?.id === rawId
          ) {
            return {
              enrollmentId: enrollment.id,
              name: enrollment.kid
                ? `${enrollment.kid.firstName} ${enrollment.kid.lastName}`.trim()
                : 'Student',
              batchName: batch.name,
              medicalNotes: enrollment.kid?.medicalNotes ?? null,
            };
          }
        }
      }
      // Allow direct enrollment UUID check-in even if batches cache is stale
      if (rawId.length >= 20) {
        return {
          enrollmentId: rawId,
          name: 'Student',
          batchName: 'Batch',
          medicalNotes: null as string | null,
        };
      }
      return null;
    },
    [batchesQuery.data],
  );

  const checkInMutation = useMutation({
    mutationFn: async (rawId: string) => {
      if (!token) throw new Error('Not signed in');
      const match = resolveEnrollmentId(rawId);
      if (!match) throw new Error('Student not found in your batches.');
      await markEnrollmentAttendance(token, match.enrollmentId, {
        date: todayString(),
        present: true,
        notes: 'QR / manual check-in',
      });
      return match;
    },
    onSuccess: async (match) => {
      setStatus(`Checked in ${match.name}`);
      await queryClient.invalidateQueries({ queryKey: ['trainer'] });
      const time = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      router.replace({
        pathname: '/coach/check-in-success',
        params: {
          enrollmentId: match.enrollmentId,
          name: match.name,
          batchName: match.batchName,
          medicalNotes: match.medicalNotes ?? '',
          time,
        },
      } as never);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Check-in failed';
      setStatus(message);
      Alert.alert('Check-in failed', message);
    },
    onSettled: () => {
      scanningLock.current = false;
    },
  });

  const onBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanningLock.current || checkInMutation.isPending) return;
      const id = parseStudentQr(result.data);
      if (!id) return;
      scanningLock.current = true;
      checkInMutation.mutate(id);
    },
    [checkInMutation],
  );

  function submitManual() {
    const id = parseStudentQr(manualId);
    if (!id) {
      Alert.alert('Invalid ID', 'Enter a student or enrollment ID.');
      return;
    }
    checkInMutation.mutate(id);
  }

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: '#111' }]}>
        <FitoraLoader variant="screen" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[styles.center, { backgroundColor: CoachColors.background, padding: Spacing.xl }]}
      >
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          Allow camera permission to scan student attendance QR codes.
        </Text>
        <Pressable style={styles.permissionBtn} onPress={() => void requestPermission()}>
          <Text style={styles.permissionBtnText}>Enable Camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: CoachColors.primary, fontWeight: '700' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onBarcode}
      />
      <View style={[styles.overlay, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Attendance</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.firstName?.[0] ?? 'C').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <View style={styles.innerFrame} />
          </View>
          <Text style={styles.hintTitle}>Align student ID QR within frame</Text>
          <Text style={styles.hintBody}>Scanning will happen automatically</Text>
          <Pressable style={styles.torchBtn} onPress={() => setTorch((v) => !v)}>
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={22} color="#fff" />
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
          {checkInMutation.isPending ? (
            <ActivityIndicator color={CoachColors.primary} style={{ marginTop: Spacing.md }} />
          ) : null}
        </View>

        <View style={[styles.manualSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.manualLabelRow}>
            <Ionicons name="keypad-outline" size={14} color={CoachColors.muted} />
            <Text style={styles.manualLabel}>MANUAL ENTRY</Text>
          </View>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="Booking or Student ID"
              placeholderTextColor={CoachColors.muted}
              value={manualId}
              onChangeText={setManualId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.checkInBtn, checkInMutation.isPending && { opacity: 0.6 }]}
              disabled={checkInMutation.isPending}
              onPress={submitManual}
            >
              <Text style={styles.checkInText}>Check-in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#000', flex: 1 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  title: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
  avatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.primaryContainer,
    borderRadius: Radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  frameWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  frame: {
    height: 240,
    marginBottom: Spacing.lg,
    position: 'relative',
    width: 240,
  },
  innerFrame: {
    borderColor: 'rgba(0,200,180,0.5)',
    borderRadius: 12,
    borderWidth: 1,
    bottom: 16,
    left: 16,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  corner: {
    borderColor: CoachColors.primary,
    height: 36,
    position: 'absolute',
    width: 36,
  },
  tl: { borderLeftWidth: 4, borderTopWidth: 4, left: 0, top: 0 },
  tr: { borderRightWidth: 4, borderTopWidth: 4, right: 0, top: 0 },
  bl: { borderBottomWidth: 4, borderLeftWidth: 4, bottom: 0, left: 0 },
  br: { borderBottomWidth: 4, borderRightWidth: 4, bottom: 0, right: 0 },
  hintTitle: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  hintBody: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.sm,
    marginTop: 4,
    textAlign: 'center',
  },
  torchBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radius.full,
    height: 48,
    justifyContent: 'center',
    marginTop: Spacing.lg,
    width: 48,
  },
  status: {
    color: CoachColors.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  manualSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  manualLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  manualLabel: {
    color: CoachColors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  manualRow: { flexDirection: 'row', gap: Spacing.sm },
  manualInput: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.md,
    color: CoachColors.foreground,
    flex: 1,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  checkInBtn: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.md,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  checkInText: { color: '#fff', fontWeight: '800' },
  permissionTitle: {
    color: CoachColors.foreground,
    fontSize: FontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionBody: {
    color: CoachColors.muted,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  permissionBtnText: { color: '#fff', fontWeight: '800' },
});
