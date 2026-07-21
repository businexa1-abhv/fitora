import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { useDefaultCourt } from '@/lib/use-default-court';
import {
  createSlotSchedule,
  deleteSlotSchedule,
  generateRecurringSlots,
  listSlotSchedules,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function OperatingHoursConfigScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { courtId: defaultCourtId, courts, token } = useDefaultCourt();
  const [selectedCourtId, setSelectedCourtId] = useState<string | undefined>(undefined);
  const courtId = selectedCourtId ?? defaultCourtId;
  const court = courts.find((c) => c.id === courtId);

  const [name, setName] = useState('Weekday Hours');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState('6');
  const [endHour, setEndHour] = useState('22');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('500');
  const [closeHolidays, setCloseHolidays] = useState(true);
  const [buffer, setBuffer] = useState('10');

  const schedulesQuery = useQuery({
    queryKey: ['owner', 'schedules', courtId],
    queryFn: () => listSlotSchedules(token!, courtId!),
    enabled: !!token && !!courtId,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!courtId) throw new Error('Select a court first');
      if (days.length === 0) throw new Error('Pick at least one day');
      return createSlotSchedule(token!, courtId, {
        name: name.trim() || 'Schedule',
        daysOfWeek: days,
        startHour: Number(startHour) || 6,
        endHour: Number(endHour) || 22,
        durationMinutes: Number(duration) || 60,
        basePrice: Number(price) || 0,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'schedules', courtId] });
      Alert.alert('Saved', 'Operating hours schedule created.');
    },
    onError: (e: Error) => Alert.alert('Could not save', e.message),
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!courtId) throw new Error('No court');
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14);
      return generateRecurringSlots(
        token!,
        courtId,
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
      ) as Promise<{ created?: number }>;
    },
    onSuccess: (result) =>
      Alert.alert('Generated', `${result?.created ?? 0} new slots created for the next 14 days.`),
    onError: (e: Error) =>
      Alert.alert(
        'Generate failed',
        e.message.includes('No active recurring schedules')
          ? 'Save a schedule first (tap "Save Configuration"), then generate.'
          : e.message,
      ),
  });

  const schedules = schedulesQuery.data ?? [];

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

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
        <Text style={[styles.brand, { color: colors.primary }]}>Timing Configurator</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>Operating Hours</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Manage hours and generate slots for {court?.name ?? 'your court'}.
      </Text>

      {courts.length > 1 && (
        <View style={[styles.days, { marginTop: Spacing.md }]}>
          {courts.map((c) => {
            const active = c.id === courtId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedCourtId(c.id)}
                style={[
                  styles.courtChip,
                  { backgroundColor: active ? colors.primary : colors.mutedBg },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.foreground,
                    fontWeight: '700',
                    fontSize: 12,
                  }}
                >
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {courts.length === 0 && (
        <Card style={{ marginTop: Spacing.md }}>
          <Text style={{ color: colors.muted }}>
            No courts found for your account. Add a court first from the Courts tab.
          </Text>
        </Card>
      )}

      <Card style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
        <Text style={[styles.label, { color: colors.muted }]}>Schedule Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />

        <Text style={[styles.label, { color: colors.muted }]}>Weekly Days</Text>
        <View style={styles.days}>
          {DAY_LABELS.map((label, i) => {
            const active = days.includes(i);
            return (
              <Pressable
                key={label}
                onPress={() => toggleDay(i)}
                style={[
                  styles.dayChip,
                  { backgroundColor: active ? colors.primary : colors.mutedBg },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.foreground,
                    fontWeight: '700',
                    fontSize: 11,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>Open (hr)</Text>
            <TextInput
              value={startHour}
              onChangeText={setStartHour}
              keyboardType="number-pad"
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>Close (hr)</Text>
            <TextInput
              value={endHour}
              onChangeText={setEndHour}
              keyboardType="number-pad"
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>Slot mins</Text>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>Base price</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Text style={{ color: colors.foreground, fontWeight: '700', flex: 1 }}>
            Close facilities on holidays
          </Text>
          <Switch
            value={closeHolidays}
            onValueChange={setCloseHolidays}
            trackColor={{ true: colors.secondary, false: colors.border }}
          />
        </View>
        <Text style={[styles.label, { color: colors.muted }]}>Buffer Between Slots (mins)</Text>
        <TextInput
          value={buffer}
          onChangeText={setBuffer}
          keyboardType="number-pad"
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />

        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary }]}
          disabled={createMutation.isPending || !courtId}
          onPress={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Save Configuration</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.secondary }]}
          disabled={generateMutation.isPending || !courtId}
          onPress={() => generateMutation.mutate()}
        >
          <Text style={styles.btnText}>Generate Next 14 Days</Text>
        </Pressable>
      </Card>

      <Text style={[styles.titleSm, { color: colors.foreground }]}>Weekly Schedules</Text>
      <QueryState
        isLoading={schedulesQuery.isLoading}
        isError={schedulesQuery.isError}
        error={schedulesQuery.error as Error}
        onRetry={() => schedulesQuery.refetch()}
        empty={schedules.length === 0}
      >
        <View style={{ gap: Spacing.sm }}>
          {schedules.map((s) => (
            <Card key={s.id} style={styles.schedRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: '800' }}>{s.name}</Text>
                <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                  {s.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')} · {s.startHour}:00–
                  {s.endHour}:00 · {s.durationMinutes}m · {formatCurrency(Number(s.basePrice))}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  courtId &&
                  Alert.alert('Delete schedule?', s.name, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteSlotSchedule(token!, courtId, s.id);
                        await queryClient.invalidateQueries({
                          queryKey: ['owner', 'schedules', courtId],
                        });
                      },
                    },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </Card>
          ))}
        </View>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { fontSize: FontSize.sm, fontWeight: '800' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  titleSm: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dayChip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  courtChip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  btnText: { color: '#fff', fontWeight: '800' },
  schedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
});
