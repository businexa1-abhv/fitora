import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NotificationPreferences } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { QueryState } from '@/components/query-state';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/notifications';
import { FontSize, Spacing } from '@/constants/theme';

const CHANNELS: Array<{
  key: keyof Pick<
    NotificationPreferences,
    'inAppEnabled' | 'emailEnabled' | 'smsEnabled' | 'pushEnabled'
  >;
  label: string;
  desc: string;
}> = [
  { key: 'inAppEnabled', label: 'In-app', desc: 'Notification center & badges' },
  { key: 'emailEnabled', label: 'Email', desc: 'Confirmations & receipts' },
  { key: 'smsEnabled', label: 'SMS', desc: 'Reminders & urgent alerts' },
  { key: 'pushEnabled', label: 'Push', desc: 'Mobile alerts via FCM / Expo' },
];

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => getNotificationPreferences(token!),
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      updateNotificationPreferences(token!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] }),
  });

  const prefs = prefsQuery.data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Notification settings" subtitle="Choose your channels" showBack />

      <QueryState
        isLoading={prefsQuery.isLoading}
        isError={prefsQuery.isError}
        error={prefsQuery.error as Error}
        onRetry={() => prefsQuery.refetch()}
      >
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        >
          {prefs &&
            CHANNELS.map((ch) => (
              <Card key={ch.key}>
                <View style={styles.row}>
                  <View style={styles.text}>
                    <Text style={[styles.label, { color: colors.foreground }]}>{ch.label}</Text>
                    <Text style={[styles.desc, { color: colors.muted }]}>{ch.desc}</Text>
                  </View>
                  <Switch
                    value={prefs[ch.key]}
                    onValueChange={(value) => updateMutation.mutate({ [ch.key]: value })}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    disabled={updateMutation.isPending}
                  />
                </View>
              </Card>
            ))}
        </ScrollView>
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  text: { flex: 1 },
  label: { fontSize: FontSize.md, fontWeight: '700' },
  desc: { fontSize: FontSize.sm, marginTop: 2 },
});
