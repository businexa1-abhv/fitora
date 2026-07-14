import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AuthHero } from '@/components/auth/auth-hero';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthField } from '@/components/auth/auth-field';
import { profileSchema, type ProfileForm } from '@/lib/validation/auth';
import { getStoredCity, getStoredLocationLabel } from '@/lib/onboarding';
import { upsertPlayerProfile, type Gender, type SkillLevel } from '@/lib/players-api';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const GENDERS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
  { label: 'Prefer not', value: 'PREFER_NOT_TO_SAY' },
];

const SKILLS: { label: string; value: SkillLevel }[] = [
  { label: 'Beginner', value: 'BEGINNER' },
  { label: 'Intermediate', value: 'INTERMEDIATE' },
  { label: 'Advanced', value: 'ADVANCED' },
  { label: 'Pro', value: 'PROFESSIONAL' },
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { token, refreshUser, user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

  const { control, handleSubmit, setValue, watch, formState } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName && user.firstName !== 'Player' ? user.firstName : '',
      lastName: user?.lastName || '',
      city: '',
      agreeTerms: undefined as unknown as true,
    },
  });

  const gender = watch('gender');
  const skillLevel = watch('skillLevel');
  const agreeTerms = watch('agreeTerms');

  useEffect(() => {
    Promise.all([getStoredCity(), getStoredLocationLabel()]).then(([city]) => {
      if (city) setValue('city', city);
    });
  }, [setValue]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUrl(result.assets[0].uri);
    }
  }

  async function onSubmit(values: ProfileForm) {
    if (!token) {
      setError('Session expired. Please sign in again.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await upsertPlayerProfile(token, {
        firstName: values.firstName,
        lastName: values.lastName,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth,
        city: values.city,
        skillLevel: values.skillLevel,
        agreeTerms: true,
        avatarUrl,
        locationLabel: values.city,
      });
      await refreshUser();
      router.replace('/(auth)/sports');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
    >
      <AuthHero
        title="Complete your profile"
        subtitle="Set up your player identity so venues, teams, and coaches recognize you."
        stepCurrent={1}
        stepTotal={3}
      >
        <Pressable
          onPress={pickPhoto}
          style={[styles.avatar, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <>
              <Ionicons name="camera" size={24} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '800', marginTop: Spacing.xs }}>Add photo</Text>
            </>
          )}
        </Pressable>

        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label="First name"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={formState.errors.firstName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label="Last name"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={formState.errors.lastName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="dateOfBirth"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label="Date of birth (YYYY-MM-DD)"
              placeholder="1998-05-12"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={formState.errors.dateOfBirth?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="city"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label="City"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={formState.errors.city?.message}
            />
          )}
        />

        <Text style={[styles.section, { color: colors.muted }]}>Gender</Text>
        <View style={styles.chips}>
          {GENDERS.map((g) => (
            <Pressable
              key={g.value}
              onPress={() => setValue('gender', g.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: gender === g.value ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: gender === g.value ? colors.primaryForeground : colors.foreground,
                  fontWeight: '600',
                  fontSize: FontSize.sm,
                }}
              >
                {g.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.muted }]}>Skill level</Text>
        <View style={styles.chips}>
          {SKILLS.map((s) => (
            <Pressable
              key={s.value}
              onPress={() => setValue('skillLevel', s.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: skillLevel === s.value ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: skillLevel === s.value ? colors.primaryForeground : colors.foreground,
                  fontWeight: '600',
                  fontSize: FontSize.sm,
                }}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setValue('agreeTerms', true, { shouldValidate: true })}
          style={styles.termsRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: colors.border,
                backgroundColor: agreeTerms ? colors.primary : 'transparent',
              },
            ]}
          />
          <Text style={{ color: colors.foreground, flex: 1, fontSize: FontSize.sm }}>
            I agree to FitOra Terms of Service and Privacy Policy
          </Text>
        </Pressable>
        {formState.errors.agreeTerms ? (
          <Text style={{ color: colors.danger, marginBottom: Spacing.md }}>
            {formState.errors.agreeTerms.message}
          </Text>
        ) : null}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.danger + '15' }]}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text>
          </View>
        ) : null}

        <AuthButton label="Continue" fullWidth loading={loading} onPress={handleSubmit(onSubmit)} />
      </AuthHero>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  section: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  termsRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginBottom: Spacing.md },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1 },
  errorBox: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
});
