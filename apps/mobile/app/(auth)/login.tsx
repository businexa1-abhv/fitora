import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAME } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { loginWithPhone, registerWithOtp, sendOtp } from '@/lib/auth-api';
import { ApiError } from '@/lib/api';

type Step = 'phone' | 'otp' | 'register';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      const purpose = step === 'register' ? 'REGISTER' : 'LOGIN';
      try {
        await sendOtp(phone, purpose);
        setStep(step === 'register' ? 'register' : 'otp');
      } catch (err) {
        // New phone → switch to registration OTP flow
        if (
          purpose === 'LOGIN' &&
          err instanceof ApiError &&
          (err.status === 401 || /no account/i.test(err.message))
        ) {
          await sendOtp(phone, 'REGISTER');
          setStep('register');
          setError('No account found. Enter the OTP and complete your profile.');
          return;
        }
        throw err;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setLoading(true);
    try {
      const response = await loginWithPhone(phone, otp);
      await signIn(response);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStep('register');
        setError('No account found. Complete your profile to register.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Invalid OTP');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError(null);
    setLoading(true);
    try {
      const response = await registerWithOtp({
        phone,
        otp,
        email,
        firstName,
        lastName,
      });
      await signIn(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xxxl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.brand, { color: colors.primary }]}>{APP_NAME}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {step === 'register' ? 'Create your account' : 'Sign in with OTP'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Book courts, memberships, training, and more.
        </Text>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.danger + '15' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.muted }]}>Phone number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.muted}
            editable={step === 'phone'}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />

          {(step === 'otp' || step === 'register') && (
            <>
              <Text style={[styles.label, { color: colors.muted }]}>OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                placeholder="6-digit code"
                placeholderTextColor={colors.muted}
                maxLength={6}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </>
          )}

          {step === 'register' && (
            <>
              <Text style={[styles.label, { color: colors.muted }]}>First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
              <Text style={[styles.label, { color: colors.muted }]}>Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
              <Text style={[styles.label, { color: colors.muted }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </>
          )}
        </View>

        {step === 'phone' && (
          <Button
            label={loading ? 'Sending…' : 'Send OTP'}
            fullWidth
            disabled={loading}
            onPress={handleSendOtp}
          />
        )}
        {step === 'otp' && (
          <>
            <Button
              label={loading ? 'Verifying…' : 'Verify & sign in'}
              fullWidth
              disabled={loading}
              onPress={handleVerifyOtp}
            />
            <Button
              label="Resend OTP"
              variant="outline"
              fullWidth
              style={{ marginTop: Spacing.sm }}
              onPress={handleSendOtp}
            />
          </>
        )}
        {step === 'register' && (
          <Button
            label={loading ? 'Creating…' : 'Create account'}
            fullWidth
            disabled={loading}
            onPress={handleRegister}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  brand: { fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: FontSize.hero, fontWeight: '800', marginTop: Spacing.sm },
  subtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, marginBottom: Spacing.xl },
  form: { gap: Spacing.sm, marginBottom: Spacing.xl },
  label: { fontSize: FontSize.sm, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.sm,
  },
  errorBox: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  errorText: { fontSize: FontSize.sm, fontWeight: '600' },
});
