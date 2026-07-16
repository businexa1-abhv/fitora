import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { getEnrollmentAttendance, getProgressReports, getTrainerBatches } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type TabKey = 'bio' | 'progress' | 'attendance';

function calcAge(dob?: string | null) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export default function StudentProfileDetailScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('bio');

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches', 'students'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  const match = useMemo(() => {
    for (const batch of batchesQuery.data ?? []) {
      const enrollment = (batch.enrollments ?? []).find((e) => e.id === enrollmentId);
      if (enrollment) {
        return { batch, enrollment, kid: enrollment.kid };
      }
    }
    return null;
  }, [batchesQuery.data, enrollmentId]);

  const attendanceQuery = useQuery({
    queryKey: ['trainer', 'enrollment-attendance', enrollmentId],
    queryFn: () => getEnrollmentAttendance(token!, enrollmentId!),
    enabled: !!token && !!enrollmentId && tab === 'attendance',
  });

  const reportsQuery = useQuery({
    queryKey: ['trainer', 'progress-reports', enrollmentId],
    queryFn: () => getProgressReports(token!, enrollmentId!),
    enabled: !!token && !!enrollmentId && tab === 'progress',
  });

  const kid = match?.kid;
  const sport = String(match?.batch.program?.sportType ?? match?.batch.program?.name ?? 'Training');
  const age = calcAge(kid?.dateOfBirth) ?? kid?.age;
  const name = kid ? `${kid.firstName} ${kid.lastName}`.trim() : 'Student';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (batchesQuery.isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={CoachColors.primary} size="large" />
      </View>
    );
  }

  if (!match || !kid) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + Spacing.xl }]}>
        <Text style={styles.emptyTitle}>Student not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={{ color: CoachColors.primary, fontWeight: '800' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: CoachColors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={CoachColors.brand} />
          </Pressable>
          <Text style={styles.topTitle}>Student Profile</Text>
          <View style={styles.topRight}>
            <Pressable onPress={() => router.push('/coach/qr-attendance' as never)} hitSlop={8}>
              <Ionicons name="qr-code-outline" size={20} color={CoachColors.muted} />
            </Pressable>
            <View style={styles.coachAvatar}>
              <Text style={styles.coachAvatarText}>
                {(user?.firstName?.[0] ?? 'C').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: CoachColors.softOrange }]}>
              <Text style={[styles.badgeText, { color: CoachColors.primaryContainer }]}>
                Intermediate Level
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: CoachColors.mutedBg }]}>
              <MaterialCommunityIcons name="tennis" size={12} color={CoachColors.muted} />
              <Text style={[styles.badgeText, { color: CoachColors.muted }]}>{sport}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.messageBtn}
              onPress={() => {
                const phone = kid.emergencyPhone?.replace(/\s/g, '');
                if (phone) void Linking.openURL(`sms:${phone}`);
              }}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#fff" />
              <Text style={styles.messageText}>Message Parent</Text>
            </Pressable>
            <Pressable
              style={styles.callBtn}
              onPress={() => {
                const phone = kid.emergencyPhone?.replace(/\s/g, '');
                if (phone) void Linking.openURL(`tel:${phone}`);
              }}
            >
              <Ionicons name="call-outline" size={16} color={CoachColors.foreground} />
              <Text style={styles.callText}>Call</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.tabs}>
          {(
            [
              ['bio', 'Bio'],
              ['progress', 'Progress'],
              ['attendance', 'Attendance'],
            ] as const
          ).map(([key, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={styles.tabBtn}>
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
              {tab === key ? <View style={styles.tabUnderline} /> : null}
            </Pressable>
          ))}
        </View>

        {tab === 'bio' ? (
          <View style={{ marginTop: Spacing.lg }}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age</Text>
              <Text style={styles.detailValue}>{age != null ? `${age} Years` : '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sport</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="tennis" size={14} color={CoachColors.foreground} />
                <Text style={styles.detailValue}>{sport}</Text>
              </View>
            </View>
            <View style={styles.medicalBanner}>
              <Ionicons name="medkit" size={16} color={CoachColors.danger} />
              <Text style={styles.medicalLabel}>Medical History</Text>
              <Text style={styles.medicalValue}>{kid.medicalNotes?.trim() || 'None on file'}</Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Contacts</Text>
            <View style={styles.contactCard}>
              <Text style={styles.contactLabel}>Parent (Primary)</Text>
              <Text style={styles.contactName}>{kid.emergencyContact || '—'}</Text>
              {kid.emergencyPhone ? (
                <Pressable
                  style={styles.phoneRow}
                  onPress={() => void Linking.openURL(`tel:${kid.emergencyPhone}`)}
                >
                  <Ionicons name="call-outline" size={14} color={CoachColors.primary} />
                  <Text style={styles.phoneText}>{kid.emergencyPhone}</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.contactCard}>
              <Text style={styles.contactLabel}>Emergency Contact</Text>
              <Text style={styles.contactName}>{kid.emergencyContact || '—'}</Text>
            </View>
            {kid.school ? (
              <View style={styles.contactCard}>
                <Text style={styles.contactLabel}>School</Text>
                <Text style={styles.contactName}>{kid.school}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === 'progress' ? (
          <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
            <Pressable
              style={styles.reportCta}
              onPress={() =>
                router.push({
                  pathname: '/coach/report/[enrollmentId]',
                  params: { enrollmentId },
                } as never)
              }
            >
              <Text style={styles.reportCtaText}>Open Performance Report</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </Pressable>
            {(reportsQuery.data ?? []).length === 0 ? (
              <Text style={styles.muted}>No progress reports yet.</Text>
            ) : (
              (reportsQuery.data ?? []).map((report) => (
                <View key={report.id} style={styles.reportCard}>
                  <Text style={styles.contactName}>
                    {report.periodStart} → {report.periodEnd}
                  </Text>
                  <Text style={styles.muted} numberOfLines={3}>
                    {report.summary}
                  </Text>
                  <Text style={styles.badgeText}>
                    {report.isPublished ? 'Published' : 'Draft'} ·{' '}
                    {report.rating != null ? `${report.rating}/5` : 'Unrated'}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'attendance' ? (
          <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
            {(attendanceQuery.data ?? []).length === 0 ? (
              <Text style={styles.muted}>No attendance records yet.</Text>
            ) : (
              (attendanceQuery.data ?? []).slice(0, 20).map((row) => (
                <View key={row.id} style={styles.attendRow}>
                  <Text style={styles.contactName}>{row.date}</Text>
                  <View
                    style={[
                      styles.attendPill,
                      {
                        backgroundColor: row.present ? CoachColors.softGreen : CoachColors.softRed,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: row.present ? CoachColors.secondary : CoachColors.danger,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      {row.present ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() =>
          router.push({
            pathname: '/coach/report/[enrollmentId]',
            params: { enrollmentId },
          } as never)
        }
      >
        <Ionicons name="create-outline" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  emptyTitle: { color: CoachColors.foreground, fontSize: FontSize.lg, fontWeight: '800' },
  backLink: { marginTop: Spacing.md },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  topTitle: { color: CoachColors.brand, fontSize: FontSize.lg, fontWeight: '800' },
  topRight: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  coachAvatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.primaryContainer,
    borderRadius: Radius.full,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  coachAvatarText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  profileCard: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderColor: CoachColors.primary,
    borderRadius: Radius.full,
    borderWidth: 3,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  avatarText: { color: CoachColors.primaryContainer, fontSize: 28, fontWeight: '800' },
  onlineDot: {
    backgroundColor: CoachColors.success,
    borderColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    bottom: 4,
    height: 16,
    position: 'absolute',
    right: 6,
    width: 16,
  },
  name: {
    color: CoachColors.foreground,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  badge: {
    alignItems: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, width: '100%' },
  messageBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    flex: 1.4,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  messageText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  callBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  callText: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '800' },
  tabs: {
    borderBottomColor: CoachColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: Spacing.xl,
  },
  tabBtn: { flex: 1, paddingBottom: Spacing.sm },
  tabLabel: {
    color: CoachColors.muted,
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabLabelActive: { color: CoachColors.brand },
  tabUnderline: {
    alignSelf: 'center',
    backgroundColor: CoachColors.brand,
    borderRadius: 2,
    height: 3,
    marginTop: 8,
    width: 40,
  },
  sectionTitle: {
    color: CoachColors.brand,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  detailLabel: { color: CoachColors.muted, fontSize: FontSize.sm },
  detailValue: { color: CoachColors.foreground, fontSize: FontSize.md, fontWeight: '800' },
  medicalBanner: {
    alignItems: 'center',
    backgroundColor: CoachColors.softRed,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  medicalLabel: { color: CoachColors.danger, flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  medicalValue: { color: CoachColors.brand, fontSize: FontSize.sm, fontWeight: '800' },
  contactCard: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  contactLabel: { color: CoachColors.muted, fontSize: FontSize.xs },
  contactName: {
    color: CoachColors.foreground,
    fontSize: FontSize.md,
    fontWeight: '800',
    marginTop: 2,
  },
  phoneRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 6 },
  phoneText: { color: CoachColors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  reportCta: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  reportCtaText: { color: '#fff', fontWeight: '800' },
  reportCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    gap: 4,
    padding: Spacing.md,
  },
  muted: { color: CoachColors.muted, fontSize: FontSize.sm },
  attendRow: {
    alignItems: 'center',
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  attendPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  fab: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.full,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
  },
});
