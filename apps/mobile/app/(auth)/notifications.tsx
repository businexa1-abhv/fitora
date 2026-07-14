import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHero } from '@/components/auth/auth-hero';
import { AuthButton } from '@/components/auth/auth-button';
import { setNotificationsOptIn } from '@/lib/players-api';
import { markNotificationsDone } from '@/lib/onboarding';
import { registerForPushNotifications } from '@/lib/push';
import { getMe } from '@/lib/auth-api';
import { saveAuthSession, getRefreshToken } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const BENEFITS = [
  { icon: 'calendar' as const, title: 'Booking reminders', body: 'Never miss your court slot.' },
  { icon: 'people' as const, title: 'Game invitations', body: 'Know when friends need one more player.' },
  { icon: 'trophy' as const, title: 'Tournament updates', body: 'Get match schedules and result alerts.' },
  { icon: 'card' as const, title: 'Membership renewal', body: 'Renew plans before they expire.' },
  { icon: 'school' as const, title: 'Coaching updates', body: 'Track batch changes and coach notes.' },
];

export default function NotificationsPermissionScreen() {
  const router = useRouter();
  const { token, refreshUser } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  async function finish(enabled: boolean) {
    setLoading(true);
    try {
      if (token) {
        await setNotificationsOptIn(token, enabled).catch(() => undefined);
        if (enabled) {
          await registerForPushNotifications(token).catch(() => undefined);
        }
        const me = await getMe(token).catch(() => null);
        if (me) {
          const refresh = await getRefreshToken();
          if (refresh) {
            await saveAuthSession({
              user: me,
              tokens: { accessToken: token, refreshToken: refresh },
            });
          }
          await refreshUser();
        }
      }
      await markNotificationsDone();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthHero
      title="Stay in the loop"
      subtitle="Turn on notifications for reminders, invites, tournaments, memberships, and coaching."
      stepCurrent={3}
      stepTotal={3}
    >
      <View style={styles.list}>
        {BENEFITS.map((item) => (
          <View
            key={item.title}
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name={item.icon} size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <AuthButton label="Allow notifications" fullWidth loading={loading} onPress={() => finish(true)} />
      <AuthButton
        label="Skip for now"
        variant="ghost"
        fullWidth
        style={{ marginTop: Spacing.sm }}
        onPress={() => finish(false)}
      />
    </AuthHero>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm, marginBottom: Spacing.xl },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  title: { fontWeight: '700', marginBottom: 2 },
});
