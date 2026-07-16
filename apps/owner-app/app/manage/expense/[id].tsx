import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import {
  createExpense,
  deleteExpenseApi,
  getExpense,
  updateExpense,
  type VenueExpense,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const CATEGORIES = ['Facilities', 'Inventory', 'Staff', 'Utilities', 'Maintenance', 'Other'];
const METHODS: Array<NonNullable<VenueExpense['paymentMethod']>> = ['Cash', 'Card', 'UPI'];

export default function ExpenseDetailEditScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isNew = !params.id || params.id === 'new';

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Maintenance');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<NonNullable<VenueExpense['paymentMethod']>>('Card');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !token || !params.id) return;
    void getExpense(token, params.id).then((found) => {
      setTitle(found.title);
      setCategory(found.category);
      setDate(found.date.slice(0, 10));
      setNotes(found.notes ?? '');
      setAmount(String(found.amount));
      setMethod(found.paymentMethod ?? 'Card');
    });
  }, [isNew, params.id, token]);

  const save = async () => {
    if (!token) return;
    const value = Number(amount);
    if (!title.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Invalid', 'Enter a title and positive amount.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        amount: value,
        date,
        notes: notes.trim() || undefined,
        paymentMethod: method,
      };
      if (isNew) await createExpense(token, payload);
      else await updateExpense(token, params.id!, payload);
      Alert.alert('Saved', 'Expense updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (isNew || !token || !params.id) {
      router.back();
      return;
    }
    Alert.alert('Delete expense?', title || 'This expense', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteExpenseApi(token, params.id!).then(() => router.back()),
      },
    ]);
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
      <ManageHeader title="FitOra Owner" />
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>EXPENSE DETAILS</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {isNew ? 'New Expense' : 'Edit Transaction'}
      </Text>

      <Card style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
        <Text style={[styles.label, { color: colors.muted }]}>Expense Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="AC Repair - Main Hall"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[
                styles.chip,
                { backgroundColor: category === c ? colors.secondary : colors.mutedBg },
              ]}
            >
              <Text
                style={{ color: category === c ? '#fff' : colors.foreground, fontWeight: '700' }}
              >
                {c}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.muted }]}>Date (YYYY-MM-DD)</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="2026-07-16"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Payment method</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {METHODS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={[
                styles.chip,
                { backgroundColor: method === m ? colors.primary : colors.mutedBg },
              ]}
            >
              <Text style={{ color: method === m ? '#fff' : colors.foreground, fontWeight: '700' }}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.muted }]}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional notes"
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.foreground, minHeight: 80 },
          ]}
        />
      </Card>

      <Pressable
        style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
        onPress={() => void save()}
        disabled={saving}
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>
          {saving ? 'Saving…' : 'Save expense'}
        </Text>
      </Pressable>
      {!isNew ? (
        <Pressable onPress={remove} style={{ marginTop: Spacing.md, alignItems: 'center' }}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Delete expense</Text>
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
