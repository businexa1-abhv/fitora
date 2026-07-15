import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { UserRole } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { ApiError } from '@/lib/api';
import { loginWithEmail } from '@/lib/auth-api';
import { MonoLabel } from '@/components/ui';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const PARTNER_URL = process.env.EXPO_PUBLIC_PARTNER_WEB_URL ?? 'http://localhost:3011';

type RoleTab = 'owner' | 'coach';

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [role, setRole] = useState<RoleTab>('owner');
  const [email, setEmail] = useState('businexa1@gmail.com');
  const [password, setPassword] = useState('OwnerPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError('');
    setBusy(true);
    try {
      const response = await loginWithEmail(email, password);
      const roles = response.user.roles ?? [];
      const isOwner = roles.includes(UserRole.COURT_OWNER) || roles.includes(UserRole.ADMIN);
      const isTrainer = roles.includes(UserRole.TRAINER);

      if (role === 'owner' && !isOwner) {
        setError('This account is not a venue owner. Switch to Coach or use owner credentials.');
        return;
      }
      if (role === 'coach' && !isTrainer && !isOwner) {
        setError('This account is not a coach/trainer.');
        return;
      }

      await signIn(response);
      void keepLoggedIn;
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xxxl,
          paddingHorizontal: Spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.brand}>
            <MaterialCommunityIcons name="dumbbell" size={20} color={colors.primary} />
            <Text style={[styles.brandText, { color: colors.primary }]}>FitOra</Text>
          </Pressable>
          <Ionicons name="help-circle-outline" size={24} color={colors.muted} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.primary }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Manage your elite fitness facility
          </Text>

          <View style={[styles.roleToggle, { backgroundColor: colors.mutedBg }]}>
            <Pressable
              onPress={() => setRole('owner')}
              style={[styles.roleBtn, role === 'owner' && { backgroundColor: colors.primary }]}
            >
              <Ionicons
                name="key-outline"
                size={16}
                color={role === 'owner' ? '#fff' : colors.primary}
              />
              <Text
                style={[styles.roleText, { color: role === 'owner' ? '#fff' : colors.primary }]}
              >
                Owner
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRole('coach')}
              style={[styles.roleBtn, role === 'coach' && { backgroundColor: colors.primary }]}
            >
              <MaterialCommunityIcons
                name="whistle-outline"
                size={16}
                color={role === 'coach' ? '#fff' : colors.primary}
              />
              <Text
                style={[styles.roleText, { color: role === 'coach' ? '#fff' : colors.primary }]}
              >
                Coach
              </Text>
            </Pressable>
          </View>

          <MonoLabel style={{ marginTop: Spacing.lg }}>Institutional Email</MonoLabel>
          <View style={[styles.inputWrap, { borderColor: colors.border }]}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="owner@fitora.com"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground }]}
              value={email}
            />
            <Ionicons name="at" size={18} color={colors.muted} />
          </View>

          <View style={styles.passwordHeader}>
            <MonoLabel>Access Code</MonoLabel>
            <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '700' }}>
              Forgot?
            </Text>
          </View>
          <View style={[styles.inputWrap, { borderColor: colors.border }]}>
            <TextInput
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              style={[styles.input, { color: colors.foreground }]}
              value={password}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.muted}
              />
            </Pressable>
          </View>

          <Pressable onPress={() => setKeepLoggedIn((v) => !v)} style={styles.keepRow}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: colors.primary,
                  backgroundColor: keepLoggedIn ? colors.primary : 'transparent',
                },
              ]}
            >
              {keepLoggedIn ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
            </View>
            <Text style={{ color: colors.muted, fontSize: FontSize.sm, flex: 1 }}>
              Keep me logged in on this workstation.
            </Text>
          </Pressable>

          {error ? (
            <Text style={{ color: colors.danger, marginBottom: Spacing.sm, fontSize: FontSize.sm }}>
              {error}
            </Text>
          ) : null}

          <Pressable
            disabled={busy}
            onPress={() => void handleLogin()}
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={styles.loginBtnText}>{busy ? 'Signing in…' : 'Log In'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => Linking.openURL(`${PARTNER_URL}/register/business`)}
            style={[styles.miniCard, { backgroundColor: colors.mutedBg }]}
          >
            <MaterialCommunityIcons name="store-plus-outline" size={22} color={colors.primary} />
            <Text style={[styles.miniTitle, { color: colors.foreground }]}>New Branch?</Text>
            <Text style={[styles.miniBody, { color: colors.muted }]}>
              Register a new studio location.
            </Text>
          </Pressable>
          <View style={[styles.miniCard, { backgroundColor: colors.mutedBg }]}>
            <Ionicons name="cube-outline" size={22} color={colors.primary} />
            <Text style={[styles.miniTitle, { color: colors.foreground }]}>SSO Portal</Text>
            <Text style={[styles.miniBody, { color: colors.muted }]}>
              Log in with enterprise credentials.
            </Text>
          </View>
        </View>

        <View style={[styles.banner, { backgroundColor: colors.primaryContainer }]}>
          <Text style={styles.bannerText}>Elevating Performance Management.</Text>
        </View>

        <Text style={[styles.footer, { color: colors.muted }]}>
          © {new Date().getFullYear()} FitOra Systems. All rights reserved.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  brand: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  brandText: { fontSize: FontSize.xl, fontWeight: '800' },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  title: { fontSize: FontSize.hero, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 4 },
  roleToggle: {
    borderRadius: Radius.md,
    flexDirection: 'row',
    marginTop: Spacing.xl,
    padding: 4,
  },
  roleBtn: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  roleText: { fontSize: FontSize.sm, fontWeight: '700' },
  inputWrap: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  input: { flex: 1, fontSize: FontSize.md, paddingVertical: Spacing.md },
  passwordHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  keepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
  },
  checkbox: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  loginBtn: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  loginBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  secondaryRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  miniCard: {
    borderRadius: Radius.lg,
    flex: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  miniTitle: { fontSize: FontSize.sm, fontWeight: '800' },
  miniBody: { fontSize: FontSize.xs, lineHeight: 16 },
  banner: {
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    padding: Spacing.xl,
  },
  bannerText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  footer: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: Spacing.xl,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
