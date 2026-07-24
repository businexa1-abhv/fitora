import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CoachHeader } from '@/components/coach-header';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type Drill = { id: string; name: string; minutes: number; tag: string };
type Metric = 'SPEED' | 'ENDURANCE' | 'PRECISION';

const DRAFT_KEY = 'fitora_coach_training_plan_draft';

const DEFAULT_DRILLS: Drill[] = [
  { id: '1', name: 'Warm-up', minutes: 10, tag: 'MOBILIZATION' },
  { id: '2', name: 'Footwork Drills', minutes: 15, tag: 'AGILITY' },
  { id: '3', name: 'Forehand Cross-court', minutes: 20, tag: 'TECHNICAL' },
];

function tagStyle(tag: string) {
  if (tag === 'MOBILIZATION') return { bg: CoachColors.softGreen, fg: CoachColors.secondary };
  if (tag === 'AGILITY') return { bg: CoachColors.softOrange, fg: CoachColors.primaryContainer };
  return { bg: CoachColors.mutedBg, fg: CoachColors.muted };
}

export default function TrainingPlanBuilderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(2);
  const [planName, setPlanName] = useState('Forehand Mastery');
  const [duration, setDuration] = useState('4 Weeks');
  const [intensity, setIntensity] = useState('Medium');
  const [metric, setMetric] = useState<Metric>('SPEED');
  const [drills, setDrills] = useState<Drill[]>(DEFAULT_DRILLS);
  const [newDrillName, setNewDrillName] = useState('');

  const totalMinutes = useMemo(() => drills.reduce((sum, d) => sum + d.minutes, 0), [drills]);

  async function saveDraft() {
    await AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ planName, duration, intensity, metric, drills, step }),
    );
    Alert.alert('Draft saved', 'Training plan draft stored on this device.');
  }

  function publish() {
    Alert.alert(
      'Save Training Plan',
      `"${planName}" will be saved as a local draft on this device. Training plan sync with your backend is coming soon.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save Draft',
          onPress: () => void saveDraft().then(() => router.back()),
        },
      ],
    );
  }

  function addDrill() {
    const name = newDrillName.trim() || `Drill ${drills.length + 1}`;
    setDrills((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name,
        minutes: 10,
        tag: 'TECHNICAL',
      },
    ]);
    setNewDrillName('');
  }

  return (
    <View style={[styles.root, { backgroundColor: CoachColors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: Spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={CoachColors.brand} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <CoachHeader onBellPress={() => router.push('/coach/qr-attendance' as never)} />
          </View>
        </View>

        <View style={styles.stepper}>
          {[
            { n: 1, label: 'Details' },
            { n: 2, label: 'Drills' },
            { n: 3, label: 'Review' },
          ].map((item, index) => (
            <Pressable key={item.n} style={styles.stepItem} onPress={() => setStep(item.n)}>
              <View
                style={[
                  styles.stepCircle,
                  item.n <= step && { backgroundColor: CoachColors.primary },
                ]}
              >
                <Text style={styles.stepNum}>{item.n}</Text>
              </View>
              <Text style={[styles.stepLabel, item.n === step && { color: CoachColors.primary }]}>
                {item.label}
              </Text>
              {index < 2 ? <View style={styles.stepLine} /> : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Plan Name</Text>
          <TextInput
            style={styles.input}
            value={planName}
            onChangeText={setPlanName}
            placeholder="Plan name"
            placeholderTextColor={CoachColors.muted}
          />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Duration</Text>
              <Pressable
                style={styles.select}
                onPress={() =>
                  setDuration((d) =>
                    d === '4 Weeks' ? '6 Weeks' : d === '6 Weeks' ? '8 Weeks' : '4 Weeks',
                  )
                }
              >
                <Text style={styles.selectText}>{duration}</Text>
                <Ionicons name="chevron-down" size={16} color={CoachColors.muted} />
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Intensity</Text>
              <Pressable
                style={styles.select}
                onPress={() =>
                  setIntensity((v) => (v === 'Medium' ? 'High' : v === 'High' ? 'Low' : 'Medium'))
                }
              >
                <Text style={styles.selectText}>{intensity}</Text>
                <Ionicons name="chevron-down" size={16} color={CoachColors.muted} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Target Metrics</Text>
          <Text style={styles.metricsHint}>
            Select the primary performance KPI for this training block.
          </Text>
          <View style={styles.metricRow}>
            {(['SPEED', 'ENDURANCE', 'PRECISION'] as Metric[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMetric(m)}
                style={[styles.metricPill, metric === m && styles.metricPillActive]}
              >
                <Text style={[styles.metricText, metric === m && { color: '#fff' }]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.seqHeader}>
          <Text style={styles.sectionTitle}>Sequence Builder</Text>
          <Text style={styles.total}>Total {totalMinutes}m</Text>
        </View>

        <View style={{ gap: Spacing.sm }}>
          {drills.map((drill) => {
            const colors = tagStyle(drill.tag);
            return (
              <View key={drill.id} style={styles.drillCard}>
                <Ionicons name="menu" size={18} color={CoachColors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.drillName}>{drill.name}</Text>
                  <View style={styles.drillMeta}>
                    <Ionicons name="time-outline" size={12} color={CoachColors.muted} />
                    <Text style={styles.muted}>{drill.minutes}m</Text>
                    <View style={[styles.tag, { backgroundColor: colors.bg }]}>
                      <Text style={{ color: colors.fg, fontSize: 10, fontWeight: '800' }}>
                        {drill.tag}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.addBox}>
          <TextInput
            style={styles.addInput}
            placeholder="Add New Drill"
            placeholderTextColor={CoachColors.muted}
            value={newDrillName}
            onChangeText={setNewDrillName}
            onSubmitEditing={addDrill}
          />
          <Pressable onPress={addDrill}>
            <Ionicons name="add-circle" size={28} color={CoachColors.primary} />
          </Pressable>
        </View>

        <Pressable style={styles.draftBtn} onPress={() => void saveDraft()}>
          <Text style={styles.draftText}>Save as Draft</Text>
        </Pressable>
        <Pressable style={styles.publishBtn} onPress={publish}>
          <Text style={styles.publishText}>Publish Training Plan</Text>
        </Pressable>
      </ScrollView>

      <Pressable style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={addDrill}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { alignItems: 'center', flexDirection: 'row', marginBottom: Spacing.md },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    alignItems: 'center',
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.full,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepNum: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepLabel: { color: CoachColors.muted, fontSize: 11, fontWeight: '700', marginTop: 4 },
  stepLine: {
    backgroundColor: CoachColors.border,
    height: 2,
    left: '60%',
    position: 'absolute',
    top: 13,
    width: '80%',
    zIndex: -1,
  },
  card: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  fieldLabel: {
    color: CoachColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.md,
    color: CoachColors.foreground,
    fontSize: FontSize.md,
    fontWeight: '700',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  row2: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  select: {
    alignItems: 'center',
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  selectText: { color: CoachColors.foreground, fontWeight: '700' },
  metricsCard: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    overflow: 'hidden',
    padding: Spacing.lg,
  },
  metricsTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  metricsHint: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, marginTop: 4 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md },
  metricPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metricPillActive: { backgroundColor: '#2e3132' },
  metricText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  seqHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  sectionTitle: { color: CoachColors.foreground, fontSize: FontSize.lg, fontWeight: '800' },
  total: { color: CoachColors.muted, fontSize: FontSize.sm, fontWeight: '700' },
  drillCard: {
    alignItems: 'center',
    backgroundColor: CoachColors.mutedBg,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  drillName: { color: CoachColors.foreground, fontSize: FontSize.md, fontWeight: '800' },
  drillMeta: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
  muted: { color: CoachColors.muted, fontSize: FontSize.xs },
  tag: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  addBox: {
    alignItems: 'center',
    borderColor: CoachColors.border,
    borderRadius: Radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addInput: { color: CoachColors.foreground, flex: 1, fontSize: FontSize.sm, paddingVertical: 8 },
  draftBtn: {
    borderColor: CoachColors.brand,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  draftText: {
    color: CoachColors.brand,
    fontSize: FontSize.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  publishBtn: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  publishText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800', textAlign: 'center' },
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
