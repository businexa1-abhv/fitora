import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import {
  createStaffShift,
  deleteStaffShiftApi,
  listStaffShifts,
  updateStaffShift,
  type VenueStaffShift,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const ROLES: VenueStaffShift['role'][] = ['Front Desk', 'Coach', 'Maintenance'];

export default function StaffShiftEditorScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();

  const [staffName, setStaffName] = useState('');
  const [role, setRole] = useState<VenueStaffShift['role']>('Coach');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [area, setArea] = useState('Court 2');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !params.id) return;
    void listStaffShifts(token).then((items) => {
      const found = items.find((s) => s.id === params.id);
      if (!found) return;
      setStaffName(found.staffName);
      setRole(found.role);
      setDate(found.date.slice(0, 10));
      setStartTime(found.startTime);
      setEndTime(found.endTime);
      setArea(found.area);
      setNotes(found.notes ?? '');
    });
  }, [params.id, token]);

  const save = async () => {
    if (!token) return;
    if (!staffName.trim()) {
      Alert.alert('Missing', 'Enter staff member name.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        staffName: staffName.trim(),
        role,
        date,
        startTime,
        endTime,
        area: area.trim() || 'Court',
        notes: notes.trim() || undefined,
      };
      if (params.id) await updateStaffShift(token, params.id, payload);
      else await createStaffShift(token, payload);
      await queryClient.invalidateQueries({ queryKey: ['owner', 'staff-shifts'] });
      Alert.alert('Saved', 'Shift schedule updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

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
      <ManageHeader title="Edit Shift" />
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>SHIFT DETAILS</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {params.id ? 'Edit Schedule' : 'New Shift'}
      </Text>

      <Card style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
        <Text style={[styles.label, { color: colors.muted }]}>Staff Member</Text>
        <TextInput
          value={staffName}
          onChangeText={setStaffName}
          placeholder="Coach name"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Role</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {ROLES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={[
                styles.chip,
                { backgroundColor: role === r ? colors.primary : colors.mutedBg },
              ]}
            >
              <Text style={{ color: role === r ? '#fff' : colors.foreground, fontWeight: '700' }}>
                {r}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.muted }]}>Date</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>Start</Text>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>End</Text>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          </View>
        </View>
        <Text style={[styles.label, { color: colors.muted }]}>Area</Text>
        <TextInput
          value={area}
          onChangeText={setArea}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.foreground, minHeight: 72 },
          ]}
        />
      </Card>

      <Pressable
        style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
        onPress={() => void save()}
        disabled={saving}
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>
          {saving ? 'Saving…' : 'Save shift'}
        </Text>
      </Pressable>
      {params.id ? (
        <Pressable
          onPress={() =>
            Alert.alert('Delete shift?', staffName, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () =>
                  void deleteStaffShiftApi(token!, params.id!).then(() => {
                    void queryClient.invalidateQueries({ queryKey: ['owner', 'staff-shifts'] });
                    router.back();
                  }),
              },
            ])
          }
          style={{ marginTop: Spacing.md, alignItems: 'center' }}
        >
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Delete shift</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: 4 },
  label: { fontSize: 11, fontWeight: '700', marginTop: Spacing.sm },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  chip: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
