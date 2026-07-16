import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import {
  createProgressReport,
  createTrainingNote,
  getProgressReports,
  getTrainerBatches,
  listTrainingNotes,
} from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= value ? 'star' : 'star-outline'}
          size={16}
          color={CoachColors.primary}
        />
      ))}
    </View>
  );
}

function MonthBars() {
  const heights = [28, 36, 44, 52, 64];
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  return (
    <View style={styles.barRow}>
      {heights.map((h, i) => (
        <View key={labels[i]} style={styles.barCol}>
          <View
            style={[
              styles.bar,
              {
                height: h,
                backgroundColor:
                  i === heights.length - 1 ? CoachColors.primary : CoachColors.chartBar,
              },
            ]}
          />
          <Text style={styles.barLabel}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PerformanceReportScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');

  const batchesQuery = useQuery({
    queryKey: ['trainer', 'batches', 'students'],
    queryFn: () => getTrainerBatches(token!),
    enabled: !!token,
  });

  const match = useMemo(() => {
    for (const batch of batchesQuery.data ?? []) {
      const enrollment = (batch.enrollments ?? []).find((e) => e.id === enrollmentId);
      if (enrollment?.kid) return { batch, enrollment, kid: enrollment.kid };
    }
    return null;
  }, [batchesQuery.data, enrollmentId]);

  const reportsQuery = useQuery({
    queryKey: ['trainer', 'progress-reports', enrollmentId],
    queryFn: () => getProgressReports(token!, enrollmentId!),
    enabled: !!token && !!enrollmentId,
  });

  const notesQuery = useQuery({
    queryKey: ['trainer', 'notes', enrollmentId],
    queryFn: () => listTrainingNotes(token!, { enrollmentId }),
    enabled: !!token && !!enrollmentId,
  });

  const latest = reportsQuery.data?.[0];
  const latestNote = notesQuery.data?.[0];
  const skills = (latest?.skills as { skill: string; rating: number }[] | null | undefined) ?? [
    { skill: 'Footwork', rating: 4 },
    { skill: 'Serve', rating: 4 },
    { skill: 'Backhand', rating: 3 },
  ];
  const overall = latest?.rating ?? 4.2;
  const name = match?.kid ? `${match.kid.firstName} ${match.kid.lastName}`.trim() : 'Student';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const noteMutation = useMutation({
    mutationFn: () => {
      if (!token || !comment.trim()) throw new Error('Write a comment first');
      return createTrainingNote(token, {
        enrollmentId,
        batchId: match?.batch.id,
        title: 'Coach Comments',
        content: comment.trim(),
        isPrivate: false,
      });
    },
    onSuccess: async () => {
      setEditing(false);
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['trainer', 'notes', enrollmentId] });
      Alert.alert('Saved', 'Coach comment updated.');
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () => {
      if (!token || !enrollmentId) throw new Error('Missing enrollment');
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return createProgressReport(token, {
        enrollmentId,
        periodStart: start.toISOString().slice(0, 10),
        periodEnd: end.toISOString().slice(0, 10),
        summary:
          latestNote?.content ||
          `${name} is progressing well. Focus next block on consistency and recovery.`,
        skills,
        rating: Math.round(Number(overall)) || 4,
        publish: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['trainer', 'progress-reports', enrollmentId],
      });
      Alert.alert('Shared', 'Performance report published for the parent.');
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  async function shareReport() {
    const body = [
      `FitOra Performance Report — ${name}`,
      `Overall: ${overall}/5`,
      latest?.summary ?? latestNote?.content ?? 'No summary yet.',
    ].join('\n\n');
    await Share.share({ message: body });
  }

  if (batchesQuery.isLoading || reportsQuery.isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={CoachColors.primary} size="large" />
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
            <Ionicons name="arrow-back" size={22} color={CoachColors.primary} />
          </Pressable>
          <Text style={styles.brand}>FitOra Coach</Text>
          <View style={styles.topRight}>
            <Ionicons name="notifications-outline" size={20} color={CoachColors.muted} />
            <View style={styles.coachAvatar}>
              <Text style={styles.coachAvatarText}>
                {(user?.firstName?.[0] ?? 'C').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{match?.batch.name ?? 'Training'} · Intermediate Tier</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE REPORT</Text>
          </View>
          <Text style={styles.score}>{Number(overall).toFixed(1)} / 5</Text>
          <Text style={styles.scoreLabel}>Current Performance</Text>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="bar-chart-outline" size={16} color={CoachColors.brand} />
            <Text style={styles.sectionTitle}>Technical Skills</Text>
          </View>
          <Text style={styles.link}>Detailed History</Text>
        </View>
        <View style={styles.card}>
          {skills.map((skill) => (
            <View key={skill.skill} style={styles.skillRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.skillName}>{skill.skill}</Text>
                <Text style={styles.meta}>Skill rating</Text>
              </View>
              <Stars value={skill.rating} />
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>MONTHLY PROGRESS</Text>
        <View style={styles.card}>
          <MonthBars />
        </View>

        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>ACTIVE GOAL</Text>
          <Text style={styles.goalTitle}>Reach Advanced Tier by Dec 2024</Text>
          <View style={styles.goalProgressRow}>
            <Ionicons name="star" size={14} color="#fff" />
            <Text style={styles.goalProgressText}>65% Progress</Text>
          </View>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: '65%' }]} />
          </View>
          <Text style={styles.goalFooter}>On track to finish 2 weeks early</Text>
        </View>

        <View style={[styles.sectionLeft, { marginTop: Spacing.xl }]}>
          <Ionicons name="warning-outline" size={16} color={CoachColors.warning} />
          <Text style={styles.sectionTitle}>Areas to Improve</Text>
        </View>
        <View style={styles.improveCard}>
          <Text style={styles.improveTitle}>Backhand Recovery</Text>
          <Text style={styles.meta}>Slow transition back to center court after wide shots.</Text>
        </View>
        <View style={styles.improveCard}>
          <Text style={styles.improveTitle}>Second Serve Depth</Text>
          <Text style={styles.meta}>Returns drop short, allowing opponents easy returns.</Text>
        </View>

        <View style={[styles.sectionLeft, { marginTop: Spacing.xl }]}>
          <Ionicons name="chatbubble-outline" size={16} color={CoachColors.brand} />
          <Text style={styles.sectionTitle}>Coach Comments</Text>
        </View>
        <View style={styles.card}>
          {editing ? (
            <>
              <TextInput
                style={styles.commentInput}
                multiline
                value={comment}
                onChangeText={setComment}
                placeholder="Write coach comments…"
                placeholderTextColor={CoachColors.muted}
              />
              <Pressable
                style={styles.saveNoteBtn}
                onPress={() => noteMutation.mutate()}
                disabled={noteMutation.isPending}
              >
                <Text style={styles.saveNoteText}>
                  {noteMutation.isPending ? 'Saving…' : 'Save Note'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.quoteMark}>“</Text>
              <Text style={styles.commentBody}>
                {latestNote?.content ||
                  latest?.summary ||
                  `${name} has shown exceptional discipline. Focus next on psychological endurance.`}
              </Text>
              <View style={styles.commentFooter}>
                <Text style={styles.meta}>{latestNote ? 'Updated recently' : 'No note yet'}</Text>
                <Pressable
                  style={styles.editNoteBtn}
                  onPress={() => {
                    setComment(latestNote?.content ?? latest?.summary ?? '');
                    setEditing(true);
                  }}
                >
                  <Ionicons name="pencil" size={12} color={CoachColors.primary} />
                  <Text style={styles.editNoteText}>Edit Note</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <Pressable
          style={styles.shareBtn}
          onPress={() => {
            void shareReport();
            publishMutation.mutate();
          }}
          disabled={publishMutation.isPending}
        >
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.shareText}>
            {publishMutation.isPending ? 'Publishing…' : 'Share Report'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.downloadBtn}
          onPress={() =>
            Alert.alert('PDF export', 'PDF download will use the shared report content for now.')
          }
        >
          <Ionicons name="document-text-outline" size={18} color={CoachColors.primary} />
          <Text style={styles.downloadText}>Download PDF</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  brand: { color: CoachColors.primary, fontSize: FontSize.lg, fontWeight: '800' },
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
  hero: { alignItems: 'center' },
  avatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  avatarText: { color: CoachColors.primaryContainer, fontSize: 28, fontWeight: '800' },
  name: {
    color: CoachColors.foreground,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  meta: { color: CoachColors.muted, fontSize: FontSize.xs, marginTop: 2 },
  activeBadge: {
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: {
    color: CoachColors.primaryContainer,
    fontSize: 10,
    fontWeight: '800',
  },
  score: {
    color: CoachColors.primaryContainer,
    fontSize: 36,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  scoreLabel: { color: CoachColors.muted, fontSize: FontSize.sm },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  sectionLeft: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  sectionTitle: { color: CoachColors.brand, fontSize: FontSize.md, fontWeight: '800' },
  link: { color: CoachColors.primary, fontSize: FontSize.xs, fontWeight: '700' },
  card: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  skillRow: {
    alignItems: 'center',
    borderBottomColor: CoachColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  skillName: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '800' },
  barRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 10, height: 90 },
  barCol: { alignItems: 'center', flex: 1, gap: 6 },
  bar: { borderRadius: 6, width: '70%' },
  barLabel: { color: CoachColors.muted, fontSize: 10, fontWeight: '700' },
  goalCard: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.xl,
    marginTop: Spacing.xl,
    overflow: 'hidden',
    padding: Spacing.lg,
  },
  goalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800' },
  goalTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800', marginTop: 6 },
  goalProgressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.md,
  },
  goalProgressText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  goalTrack: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    height: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  goalFill: { backgroundColor: '#fff', height: '100%' },
  goalFooter: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: FontSize.xs,
    marginHorizontal: -Spacing.lg,
    marginBottom: -Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  improveCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  improveTitle: { color: CoachColors.foreground, fontSize: FontSize.sm, fontWeight: '800' },
  quoteMark: {
    color: CoachColors.primary,
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 40,
  },
  commentBody: {
    color: CoachColors.foreground,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: -8,
  },
  commentFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  editNoteBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  editNoteText: { color: CoachColors.primary, fontSize: FontSize.xs, fontWeight: '800' },
  commentInput: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.md,
    color: CoachColors.foreground,
    minHeight: 100,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  saveNoteBtn: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  saveNoteText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  shareBtn: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  shareText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  downloadBtn: {
    alignItems: 'center',
    borderColor: CoachColors.primary,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  downloadText: { color: CoachColors.primary, fontSize: FontSize.md, fontWeight: '800' },
});
