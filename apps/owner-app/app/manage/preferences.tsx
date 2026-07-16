import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const LOCAL_PREFS_KEY = 'fitora.owner.app-preferences';

type LocalPrefs = {
  compactLists: boolean;
  confirmBeforeCancel: boolean;
};

export default function AppPreferencesScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<LocalPrefs>({
    compactLists: false,
    confirmBeforeCancel: true,
  });

  const notifQuery = useQuery({
    queryKey: ['owner', 'notif-prefs'],
    queryFn: () => getNotificationPreferences(token!),
    enabled: !!token,
  });

  useEffect(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(LOCAL_PREFS_KEY);
      if (raw) setLocal(JSON.parse(raw) as LocalPrefs);
    })();
  }, []);

  const saveLocal = async (next: LocalPrefs) => {
    setLocal(next);
    await AsyncStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(next));
  };

  const notifMutation = useMutation({
    mutationFn: (payload: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
      inAppEnabled?: boolean;
    }) => updateNotificationPreferences(token!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'notif-prefs'] });
    },
    onError: (e: Error) => Alert.alert('Update failed', e.message),
  });

  const prefs = notifQuery.data;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ManageHeader title="App Preferences" />
      <Text style={[styles.title, { color: colors.foreground }]}>App Preferences</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Notifications and everyday owner-app behavior.
      </Text>

      <QueryState
        isLoading={notifQuery.isLoading}
        isError={notifQuery.isError}
        error={notifQuery.error as Error}
        onRetry={() => notifQuery.refetch()}
      >
        <Card style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
          <Text style={{ color: colors.foreground, fontWeight: '800' }}>Notifications</Text>
          {(
            [
              ['emailEnabled', 'Email alerts'],
              ['pushEnabled', 'Push notifications'],
              ['smsEnabled', 'SMS alerts'],
              ['inAppEnabled', 'In-app alerts'],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={styles.toggle}>
              <Text style={{ color: colors.foreground, flex: 1 }}>{label}</Text>
              {notifMutation.isPending ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={Boolean(prefs?.[key])}
                  onValueChange={(v) => notifMutation.mutate({ [key]: v })}
                  trackColor={{ true: colors.secondary, false: colors.border }}
                />
              )}
            </View>
          ))}
        </Card>
      </QueryState>

      <Card style={{ gap: Spacing.md, marginTop: Spacing.md }}>
        <Text style={{ color: colors.foreground, fontWeight: '800' }}>Display</Text>
        <View style={styles.toggle}>
          <Text style={{ color: colors.foreground, flex: 1 }}>Compact list density</Text>
          <Switch
            value={local.compactLists}
            onValueChange={(v) => void saveLocal({ ...local, compactLists: v })}
            trackColor={{ true: colors.secondary, false: colors.border }}
          />
        </View>
        <View style={styles.toggle}>
          <Text style={{ color: colors.foreground, flex: 1 }}>Confirm before cancel</Text>
          <Switch
            value={local.confirmBeforeCancel}
            onValueChange={(v) => void saveLocal({ ...local, confirmBeforeCancel: v })}
            trackColor={{ true: colors.secondary, false: colors.border }}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  toggle: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
});
