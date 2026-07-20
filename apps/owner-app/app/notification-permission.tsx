import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { registerForPushNotifications } from '@/lib/push';

const ASKED_KEY = 'fitora_owner_notification_asked';

const benefits: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; body: string }> = [
  {
    icon: 'calendar-outline',
    title: 'Instant booking alerts',
    body: 'Know the moment a player books your court.',
  },
  {
    icon: 'card-outline',
    title: 'Payment confirmations',
    body: 'Get notified when payments land in your account.',
  },
  {
    icon: 'time-outline',
    title: 'Check-in reminders',
    body: 'Alerts 15 minutes before each session starts.',
  },
];

export default function NotificationPermissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // If already asked on this device, dismiss immediately
  useEffect(() => {
    AsyncStorage.getItem(ASKED_KEY).then((val) => {
      if (val) router.back();
    });
  }, [router]);

  async function handleAllow() {
    setLoading(true);
    await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
    if (token) await registerForPushNotifications(token).catch(() => undefined);
    setLoading(false);
    router.back();
  }

  async function handleSkip() {
    await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
    router.back();
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconBadge, { backgroundColor: colors.card }]}>
        <Ionicons name="notifications-outline" size={48} color={colors.primary} />
      </View>

      {/* Heading */}
      <Text style={[styles.title, { color: colors.foreground }]}>Stay in the loop</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Enable push notifications to manage your venue without missing a beat.
      </Text>

      {/* Benefits */}
      <View style={[styles.benefitsCard, { backgroundColor: colors.card }]}>
        {benefits.map(({ icon, title, body }) => (
          <View key={title} style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.background }]}>
              <Ionicons name={icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: colors.foreground }]}>{title}</Text>
              <Text style={[styles.benefitBody, { color: colors.muted }]}>{body}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleAllow}
          disabled={loading}
          style={[styles.allowBtn, { backgroundColor: colors.primary }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="notifications" size={18} color="#fff" />
              <Text style={styles.allowText}>Allow Notifications</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.muted }]}>Not now</Text>
        </Pressable>

        <Text style={[styles.hint, { color: colors.muted }]}>
          You can change this anytime in Settings → Notifications.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  benefitsCard: {
    width: '100%',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  benefitBody: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 'auto',
  },
  allowBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
  },
  allowText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: FontSize.md,
  },
  skipBtn: {
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  hint: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
