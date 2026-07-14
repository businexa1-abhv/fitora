import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthHero } from '@/components/auth/auth-hero';
import { AuthButton } from '@/components/auth/auth-button';
import { getDeviceId, sendOtp, verifyOtp } from '@/lib/auth-api';
import { clearPendingPhone, getPendingPhone } from '@/lib/onboarding';
import { otpSchema, type OtpForm } from '@/lib/validation/auth';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ phone?: string }>();
  const [phone, setPhone] = useState(params.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

  const { control, handleSubmit, setValue, watch } = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const otpValue = watch('otp');

  useEffect(() => {
    getPendingPhone().then((stored) => {
      if (!phone && stored) setPhone(stored);
    });
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [phone]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  useEffect(() => {
    if (otpValue?.length === 6) {
      handleSubmit(onVerify)();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpValue]);

  async function onVerify(values: OtpForm) {
    if (!phone) {
      setError('Missing phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const response = await verifyOtp(phone, values.otp, deviceId);
      await clearPendingPhone();
      await signIn(response);

      if (response.isNewUser || response.user.onboardingComplete === false) {
        router.replace('/(auth)/profile');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!phone || seconds > 0) return;
    setLoading(true);
    setError(null);
    try {
      await sendOtp(phone);
      setSeconds(RESEND_SECONDS);
      setValue('otp', '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthHero
      title="Verify your number"
      subtitle={`Enter the 6-digit code sent to ${phone || 'your phone'}`}
    >
      <Controller
        control={control}
        name="otp"
        render={({ field: { onChange, value } }) => (
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            placeholder="••••••"
            placeholderTextColor={colors.muted}
            style={[
              styles.otpInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
        )}
      />

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.danger + '15' }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      <AuthButton
        label="Verify"
        fullWidth
        loading={loading}
        onPress={handleSubmit(onVerify)}
      />

      <View style={styles.footer}>
        <Text style={{ color: colors.muted }}>
          {seconds > 0 ? `Resend in ${seconds}s` : 'Didn’t get the code?'}
        </Text>
        <Pressable onPress={onResend} disabled={seconds > 0 || loading}>
          <Text
            style={{
              color: seconds > 0 ? colors.muted : colors.primary,
              fontWeight: '700',
              marginTop: Spacing.xs,
            }}
          >
            Resend OTP
          </Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(auth)/mobile')} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: colors.foreground, fontWeight: '600' }}>Change mobile number</Text>
        </Pressable>
      </View>
    </AuthHero>
  );
}

const styles = StyleSheet.create({
  otpInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: Spacing.lg,
  },
  errorBox: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  errorText: { fontSize: FontSize.sm, fontWeight: '600' },
  footer: { marginTop: Spacing.xl, alignItems: 'center' },
});
