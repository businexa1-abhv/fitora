import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { AuthHero } from '@/components/auth/auth-hero';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthField } from '@/components/auth/auth-field';
import { sendOtp } from '@/lib/auth-api';
import { setPendingPhone } from '@/lib/onboarding';
import { phoneSchema, type PhoneForm } from '@/lib/validation/auth';
import { ApiError } from '@/lib/api';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (value.trim().startsWith('+')) return `+${digits}`;
  return digits;
}

export default function MobileNumberScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  async function onSubmit(values: PhoneForm) {
    setLoading(true);
    setError(null);
    try {
      const phone = normalizePhoneInput(values.phone);
      await sendOtp(phone);
      await setPendingPhone(phone);
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthHero
      title="What's your number?"
      subtitle="We'll send a code to verify your account."
    >
      <View style={[styles.phoneIcon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="phone-portrait-outline" size={30} color={colors.primary} />
      </View>
      <View style={[styles.country, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.flag, { color: colors.foreground }]}>🇮🇳</Text>
        <Text style={[styles.countryText, { color: colors.foreground }]}>India (+91)</Text>
      </View>

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <AuthField
            label="Mobile number"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="98765 43210"
            maxLength={13}
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={formState.errors.phone?.message}
          />
        )}
      />

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.danger + '15' }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      <AuthButton
        label="Send OTP"
        fullWidth
        loading={loading}
        disabled={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </AuthHero>
  );
}

const styles = StyleSheet.create({
  phoneIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  flag: { fontSize: 20 },
  countryText: { fontSize: FontSize.md, fontWeight: '700' },
  errorBox: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  errorText: { fontSize: FontSize.sm, fontWeight: '600' },
});
