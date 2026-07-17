import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { CoachHeader } from '@/components/coach-header';
import { markEnrollmentAttendance } from '@/lib/trainer-api';
import { todayString } from '@/lib/trainer-utils';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function parseMedical(notes?: string | null) {
  const raw = (notes ?? '').trim();
  if (!raw) return null;
  const [title, ...rest] = raw
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    title: title || 'Medical note',
    detail: rest.join('. ').trim() || raw,
  };
}

export default function AttendanceCheckInSuccessScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    enrollmentId?: string;
    name?: string;
    batchName?: string;
    medicalNotes?: string;
    time?: string;
    alreadyCheckedIn?: string;
  }>();

  const medical = parseMedical(params.medicalNotes);
  const checkInTime =
    params.time || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const undoMutation = useMutation({
    mutationFn: async () => {
      if (!token || !params.enrollmentId) throw new Error('Missing enrollment');
      return markEnrollmentAttendance(token, params.enrollmentId, {
        date: todayString(),
        present: false,
        notes: 'Undo QR check-in',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trainer'] });
      Alert.alert('Check-in undone', 'Student marked absent for today.');
      router.replace('/coach/qr-attendance' as never);
    },
    onError: (err) => {
      Alert.alert('Undo failed', err instanceof Error ? err.message : 'Try again');
    },
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: CoachColors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <CoachHeader />

      <View style={styles.successWrap}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={40} color="#fff" />
        </View>
        <Text style={styles.title}>Check-in Success</Text>
        <View style={styles.verifiedRow}>
          <Ionicons name="checkmark-circle" size={14} color={CoachColors.muted} />
          <Text style={styles.verifiedText}>
            {params.alreadyCheckedIn === '1' ? 'ALREADY CHECKED IN' : 'CHECKED IN'}
          </Text>
        </View>
      </View>

      <View style={styles.studentCard}>
        <View style={styles.studentTop}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentInitials}>
              {(params.name ?? 'S')
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{params.name ?? 'Student'}</Text>
            <Text style={styles.batchName}>{params.batchName ?? 'Training batch'}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>CHECK-IN TIME</Text>
            <Text style={styles.metaValue}>{checkInTime}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metaLabel}>STATUS</Text>
            <Text style={[styles.metaValue, { color: CoachColors.primaryContainer }]}>Present</Text>
          </View>
        </View>
      </View>

      {medical ? (
        <View style={styles.medicalCard}>
          <View style={styles.medicalAccent} />
          <View style={styles.medicalBody}>
            <View style={styles.medicalHeader}>
              <Ionicons name="warning" size={16} color={CoachColors.danger} />
              <Text style={styles.medicalKicker}>MEDICAL ALERT</Text>
            </View>
            <Text style={styles.medicalTitle}>{medical.title}</Text>
            <Text style={styles.medicalDetail}>{medical.detail}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.medicalCard, styles.medicalSafe]}>
          <View style={[styles.medicalAccent, { backgroundColor: CoachColors.success }]} />
          <View style={styles.medicalBody}>
            <View style={styles.medicalHeader}>
              <Ionicons name="shield-checkmark" size={16} color={CoachColors.success} />
              <Text style={[styles.medicalKicker, { color: CoachColors.success }]}>
                NO MEDICAL ALERTS
              </Text>
            </View>
            <Text style={[styles.medicalDetail, { color: CoachColors.muted }]}>
              No medical notes on file for this student.
            </Text>
          </View>
        </View>
      )}

      <Pressable
        style={styles.primaryBtn}
        onPress={() => router.replace('/coach/qr-attendance' as never)}
      >
        <Ionicons name="qr-code-outline" size={18} color="#fff" />
        <Text style={styles.primaryText}>Scan Next</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => {
          if (params.enrollmentId) {
            router.push({
              pathname: '/coach/student/[enrollmentId]',
              params: { enrollmentId: params.enrollmentId },
            } as never);
          } else {
            router.push('/(tabs)/students' as never);
          }
        }}
      >
        <Text style={styles.secondaryText}>View Student Profile</Text>
      </Pressable>

      <Pressable
        style={styles.undoBtn}
        disabled={undoMutation.isPending || !params.enrollmentId}
        onPress={() => {
          Alert.alert('Undo check-in?', 'This will mark the student absent for today.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Undo',
              style: 'destructive',
              onPress: () => undoMutation.mutate(),
            },
          ]);
        }}
      >
        <Text style={styles.undoText}>{undoMutation.isPending ? 'Undoing…' : 'Undo Check-in'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  successWrap: { alignItems: 'center', marginTop: Spacing.xl },
  checkCircle: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: 48,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  title: {
    color: CoachColors.foreground,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  verifiedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.sm,
  },
  verifiedText: {
    color: CoachColors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  studentCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
  },
  studentTop: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  studentAvatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  studentInitials: { color: CoachColors.primaryContainer, fontWeight: '800' },
  studentName: { color: CoachColors.foreground, fontSize: FontSize.md, fontWeight: '800' },
  batchName: { color: CoachColors.muted, fontSize: FontSize.sm, marginTop: 2 },
  divider: {
    backgroundColor: CoachColors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: {
    color: CoachColors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaValue: {
    color: CoachColors.foreground,
    fontSize: FontSize.md,
    fontWeight: '800',
    marginTop: 4,
  },
  medicalCard: {
    backgroundColor: CoachColors.softRed,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  medicalSafe: { backgroundColor: CoachColors.softGreen },
  medicalAccent: { backgroundColor: CoachColors.danger, width: 5 },
  medicalBody: { flex: 1, padding: Spacing.md },
  medicalHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  medicalKicker: {
    color: CoachColors.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  medicalTitle: {
    color: CoachColors.danger,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginTop: 6,
  },
  medicalDetail: {
    color: CoachColors.danger,
    fontSize: FontSize.sm,
    marginTop: 4,
    opacity: 0.9,
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md + 2,
  },
  primaryText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  secondaryBtn: {
    alignItems: 'center',
    borderColor: CoachColors.brand,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  secondaryText: { color: CoachColors.brand, fontSize: FontSize.md, fontWeight: '800' },
  undoBtn: { alignItems: 'center', marginTop: Spacing.lg, padding: Spacing.sm },
  undoText: { color: CoachColors.muted, fontSize: FontSize.sm, fontWeight: '700' },
});
