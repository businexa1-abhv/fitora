import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { enrollInBatch } from '@/lib/training';
import { completePayment } from '@/lib/payments';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const FIELDS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'dateOfBirth', label: 'Date of birth (YYYY-MM-DD)' },
  { key: 'gender', label: 'Gender' },
  { key: 'school', label: 'School' },
  { key: 'emergencyContact', label: 'Emergency contact name' },
  { key: 'emergencyPhone', label: 'Emergency phone' },
  { key: 'medicalNotes', label: 'Medical notes (optional)' },
] as const;

export default function EnrollScreen() {
  const { batchId, program } = useLocalSearchParams<{ batchId: string; program?: string }>();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<Record<string, string>>({});

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!token || !user || !batchId) throw new Error('Sign in required');
      const { payment } = await enrollInBatch(token, batchId, form);
      await completePayment(
        token,
        payment,
        user.email,
        `${user.firstName} ${user.lastName}`,
      );
    },
    onSuccess: () => {
      Alert.alert('Enrolled', 'Training enrollment confirmed.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/training') },
      ]);
    },
    onError: (err: Error) => Alert.alert('Enrollment failed', err.message),
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Enroll" subtitle={program ?? 'Training program'} showBack />

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.hint, { color: colors.muted }]}>
          Enter your child&apos;s details to complete enrollment and payment.
        </Text>
        {FIELDS.map(({ key, label }) => (
          <View key={key}>
            <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
            <TextInput
              value={form[key] ?? ''}
              onChangeText={(v) => setForm((prev) => ({ ...prev, [key]: v }))}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholderTextColor={colors.muted}
            />
          </View>
        ))}
        <Button
          label={enrollMutation.isPending ? 'Processing…' : 'Enroll & pay'}
          disabled={enrollMutation.isPending}
          onPress={() => enrollMutation.mutate()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.md },
  hint: { fontSize: FontSize.sm, marginBottom: Spacing.sm },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
});
