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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { createCoupon, listCoupons } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function AddEditPromotionDetailScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('10');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [active, setActive] = useState(true);

  const couponsQuery = useQuery({
    queryKey: ['owner', 'coupons'],
    queryFn: () => listCoupons(token!),
    enabled: !!token && !!params.id,
  });

  useEffect(() => {
    if (!params.id || !couponsQuery.data) return;
    const found = couponsQuery.data.find((c) => c.id === params.id);
    if (!found) return;
    setCode(found.code);
    setDescription(found.description ?? '');
    setDiscountType(found.discountType);
    setValue(String(found.discountValue));
    setUsageLimit(found.usageLimit != null ? String(found.usageLimit) : '');
    setExpiresAt(found.expiresAt ? found.expiresAt.slice(0, 10) : '');
    setActive(found.isActive !== false);
  }, [params.id, couponsQuery.data]);

  const createMutation = useMutation({
    mutationFn: () =>
      createCoupon(token!, {
        code: code.trim().toUpperCase(),
        codeType: 'PROMO',
        discountType,
        discountValue: Number(value),
        description: description.trim() || undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        expiresAt: expiresAt || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'coupons'] });
      Alert.alert('Saved', 'Promotion is live.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (e: Error) => Alert.alert('Failed', e.message),
  });

  const preview =
    discountType === 'PERCENTAGE'
      ? `${value || 0}% off`
      : `${formatCurrency(Number(value) || 0)} off`;

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
      <ManageHeader title="Promotion" />
      <Text style={[styles.title, { color: colors.foreground }]}>
        {params.id ? 'Edit Promotion' : 'Add Promotion'}
      </Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Coupon code details and player-facing preview.
      </Text>

      <QueryState
        isLoading={Boolean(params.id) && couponsQuery.isLoading}
        isError={Boolean(params.id) && couponsQuery.isError}
        error={couponsQuery.error as Error}
        onRetry={() => couponsQuery.refetch()}
      >
        <Card style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Text style={[styles.label, { color: colors.muted }]}>Code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            editable={!params.id}
            placeholder="SUMMER20"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Seasonal discount"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Discount type</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {(['PERCENTAGE', 'FIXED'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setDiscountType(t)}
                style={[
                  styles.chip,
                  { backgroundColor: discountType === t ? colors.secondary : colors.mutedBg },
                ]}
              >
                <Text
                  style={{
                    color: discountType === t ? '#fff' : colors.foreground,
                    fontWeight: '700',
                  }}
                >
                  {t === 'PERCENTAGE' ? 'Percentage' : 'Fixed ₹'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>Value</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Usage limit</Text>
          <TextInput
            value={usageLimit}
            onChangeText={setUsageLimit}
            keyboardType="number-pad"
            placeholder="Unlimited"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Expires (YYYY-MM-DD)</Text>
          <TextInput
            value={expiresAt}
            onChangeText={setExpiresAt}
            autoCapitalize="none"
            placeholder="Optional"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <View style={styles.toggle}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>Active</Text>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ true: colors.secondary, false: colors.border }}
            />
          </View>
        </Card>

        <Card style={[styles.preview, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>
            PLAYER PREVIEW
          </Text>
          <Text style={{ color: colors.primary, fontSize: FontSize.xl, fontWeight: '800' }}>
            {code.trim().toUpperCase() || 'CODE'}
          </Text>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>{preview}</Text>
        </Card>

        {!params.id ? (
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }]}
            disabled={createMutation.isPending || !code.trim()}
            onPress={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '800' }}>Create Promotion</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() =>
              Alert.alert(
                'Edit',
                'Coupon updates use deactivate + recreate. Disable from the list, then create a new code.',
              )
            }
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
          </Pressable>
        )}
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  chip: { borderRadius: Radius.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  toggle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  preview: { gap: 4, marginTop: Spacing.md, padding: Spacing.lg },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
});
