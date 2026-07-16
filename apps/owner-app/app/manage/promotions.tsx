import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { createCoupon, deactivateCoupon, listCoupons } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function DiscountsPromotionsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [value, setValue] = useState('10');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');

  const couponsQuery = useQuery({
    queryKey: ['owner', 'coupons'],
    queryFn: () => listCoupons(token!),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCoupon(token!, {
        code: code.trim().toUpperCase(),
        codeType: 'PROMO',
        discountType,
        discountValue: Number(value),
        description: 'Owner promo',
      }),
    onSuccess: async () => {
      setCode('');
      await queryClient.invalidateQueries({ queryKey: ['owner', 'coupons'] });
      Alert.alert('Created', 'Promotion code is live.');
    },
    onError: (e: Error) => Alert.alert('Create failed', e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateCoupon(token!, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'coupons'] });
    },
    onError: (e: Error) => Alert.alert('Failed', e.message),
  });

  const items = couponsQuery.data ?? [];

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
      <ManageHeader title="Discounts & Promotions" />
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Discounts & Promotions</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            Create coupon codes for bookings and memberships.
          </Text>
        </View>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/manage/promo-form')}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>

      <Card style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
        <Text style={{ color: colors.foreground, fontWeight: '800' }}>New promo code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="SUMMER20"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
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
                {t === 'PERCENTAGE' ? '%' : '₹'}
              </Text>
            </Pressable>
          ))}
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder="Value"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.foreground, flex: 1 },
            ]}
          />
        </View>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary }]}
          disabled={createMutation.isPending || !code.trim()}
          onPress={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create Code</Text>
          )}
        </Pressable>
      </Card>

      <QueryState
        isLoading={couponsQuery.isLoading}
        isError={couponsQuery.isError}
        error={couponsQuery.error as Error}
        onRetry={() => couponsQuery.refetch()}
        empty={items.length === 0}
      >
        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          {items.map((c) => {
            const discount =
              c.discountType === 'PERCENTAGE'
                ? `${c.discountValue}%`
                : formatCurrency(Number(c.discountValue));
            return (
              <Pressable
                key={c.id}
                onPress={() =>
                  router.push({ pathname: '/manage/promo-form', params: { id: c.id } })
                }
              >
                <Card style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800' }}>{c.code}</Text>
                    <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                      {discount} off · {c.usageCount ?? 0}
                      {c.usageLimit != null ? `/${c.usageLimit}` : ''} uses
                      {c.isActive === false ? ' · inactive' : ''}
                    </Text>
                  </View>
                  {c.isActive !== false ? (
                    <Pressable
                      onPress={() =>
                        Alert.alert('Deactivate code?', c.code, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Deactivate',
                            style: 'destructive',
                            onPress: () => deactivateMutation.mutate(c.id),
                          },
                        ])
                      }
                      style={[styles.smallBtn, { borderColor: colors.border }]}
                    >
                      <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 12 }}>
                        Disable
                      </Text>
                    </Pressable>
                  ) : null}
                </Card>
              </Pressable>
            );
          })}
        </View>
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  addBtn: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    marginTop: 4,
    width: 36,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  chip: {
    alignItems: 'center',
    borderRadius: Radius.md,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  btnText: { color: '#fff', fontWeight: '800' },
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, padding: Spacing.md },
  smallBtn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
