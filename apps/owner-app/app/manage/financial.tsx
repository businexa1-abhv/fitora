import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { getTenantMe, updateTenantPayments } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function FinancialSettingsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [useOwn, setUseOwn] = useState(false);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhook, setWebhook] = useState('');

  const tenantQuery = useQuery({
    queryKey: ['owner', 'tenant'],
    queryFn: () => getTenantMe(token!),
    enabled: !!token,
  });

  useEffect(() => {
    const t = tenantQuery.data;
    if (!t) return;
    setUseOwn(Boolean(t.useOwnPaymentAccount));
    setKeyId(t.razorpayKeyId ?? '');
  }, [tenantQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!tenantQuery.data?.id) throw new Error('Tenant not loaded');
      return updateTenantPayments(token!, tenantQuery.data.id, {
        useOwnPaymentAccount: useOwn,
        razorpayKeyId: keyId.trim() || undefined,
        razorpayKeySecret: keySecret.trim() || undefined,
        razorpayWebhookSecret: webhook.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setKeySecret('');
      setWebhook('');
      await queryClient.invalidateQueries({ queryKey: ['owner', 'tenant'] });
      Alert.alert('Saved', 'Payment settings updated.');
    },
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <ManageHeader title="Financial Settings" />
      <Text style={[styles.title, { color: colors.foreground }]}>Financial Settings</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Configure payout account and payment gateway credentials.
      </Text>

      <QueryState
        isLoading={tenantQuery.isLoading}
        isError={tenantQuery.isError}
        error={tenantQuery.error as Error}
        onRetry={() => tenantQuery.refetch()}
      >
        <Card style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
          <View style={styles.toggle}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                Use own Razorpay account
              </Text>
              <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                Collect payments directly to your merchant account.
              </Text>
            </View>
            <Switch
              value={useOwn}
              onValueChange={setUseOwn}
              trackColor={{ true: colors.secondary, false: colors.border }}
            />
          </View>

          <Text style={[styles.label, { color: colors.muted }]}>Razorpay Key ID</Text>
          <TextInput
            value={keyId}
            onChangeText={setKeyId}
            autoCapitalize="none"
            placeholder="rzp_live_…"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>
            Key Secret {tenantQuery.data?.hasRazorpaySecret ? '(saved)' : ''}
          </Text>
          <TextInput
            value={keySecret}
            onChangeText={setKeySecret}
            autoCapitalize="none"
            secureTextEntry
            placeholder="Enter to update"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Webhook Secret</Text>
          <TextInput
            value={webhook}
            onChangeText={setWebhook}
            autoCapitalize="none"
            secureTextEntry
            placeholder="Enter to update"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />

          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }]}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Save Settings</Text>
            )}
          </Pressable>
        </Card>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  toggle: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  label: { fontSize: 11, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  btnText: { color: '#fff', fontWeight: '800' },
});
