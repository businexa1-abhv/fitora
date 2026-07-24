import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { QueryState } from '@/components/ui';
import { getTrainerProfile, updateTrainerProfile } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CoachEditProfileScreen() {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [specializations, setSpecializations] = useState('');

  const profileQuery = useQuery({
    queryKey: ['trainer', 'profile'],
    queryFn: () => getTrainerProfile(token!),
    enabled: !!token,
  });

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setBio(p.bio ?? '');
    setYearsExperience(p.yearsExperience != null ? String(p.yearsExperience) : '');
    setSpecializations((p.specializations ?? []).join(', '));
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const specs = specializations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const yearsNum = yearsExperience.trim() ? parseInt(yearsExperience.trim(), 10) : undefined;
      return updateTrainerProfile(token!, {
        bio: bio.trim() || undefined,
        yearsExperience: Number.isNaN(yearsNum ?? NaN) ? undefined : yearsNum,
        specializations: specs.length ? specs : undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trainer', 'profile'] });
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err) =>
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile'),
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: CoachColors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={CoachColors.brand} />
        <Text style={{ color: CoachColors.brand, fontWeight: '700', fontSize: FontSize.md }}>
          Back
        </Text>
      </Pressable>

      <Text style={[styles.title, { color: CoachColors.foreground }]}>Edit Profile</Text>
      <Text style={{ color: CoachColors.muted, marginTop: 4 }}>
        Update your coaching bio and specializations visible to students.
      </Text>

      {/* Read-only user info */}
      <View style={[styles.infoCard, { backgroundColor: CoachColors.card }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.firstName?.[0] ?? 'C').toUpperCase()}
            {(user?.lastName?.[0] ?? '').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: CoachColors.foreground, fontWeight: '800', fontSize: FontSize.md }}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={{ color: CoachColors.muted, fontSize: FontSize.sm }}>{user?.email}</Text>
        </View>
      </View>

      <QueryState
        isLoading={profileQuery.isLoading}
        isError={profileQuery.isError}
        error={profileQuery.error as Error}
        onRetry={() => profileQuery.refetch()}
      >
        <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
          <Label text="Bio / About Me" />
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Describe your coaching philosophy and experience…"
            placeholderTextColor={CoachColors.muted}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.multiline, { color: CoachColors.foreground }]}
          />

          <Label text="Years of Experience" />
          <TextInput
            value={yearsExperience}
            onChangeText={setYearsExperience}
            placeholder="e.g. 5"
            placeholderTextColor={CoachColors.muted}
            keyboardType="number-pad"
            style={[styles.input, { color: CoachColors.foreground }]}
          />

          <Label text="Specializations (comma-separated)" />
          <TextInput
            value={specializations}
            onChangeText={setSpecializations}
            placeholder="e.g. Badminton, Tennis, Fitness"
            placeholderTextColor={CoachColors.muted}
            style={[styles.input, { color: CoachColors.foreground }]}
          />

          <Pressable
            style={[
              styles.saveBtn,
              { backgroundColor: saveMutation.isPending ? CoachColors.muted : CoachColors.primary },
            ]}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Text style={styles.saveBtnText}>
              {saveMutation.isPending ? 'Saving…' : 'Save Profile'}
            </Text>
          </Pressable>
        </View>
      </QueryState>
    </ScrollView>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: CoachColors.muted,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  infoCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.primaryContainer,
    borderRadius: Radius.full,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  input: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.md,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  saveBtn: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
});
