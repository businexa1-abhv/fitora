import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { checkout } from '@/lib/shop';
import { completePayment } from '@/lib/payments';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CheckoutScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    shippingName: user ? `${user.firstName} ${user.lastName}` : '',
    shippingPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPincode: '',
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!token || !user) throw new Error('Sign in required');
      const { order, payment } = await checkout(token, form);
      await completePayment(token, payment, user.email, `${user.firstName} ${user.lastName}`);
      return order;
    },
    onSuccess: () => {
      Alert.alert('Order placed', 'Your order has been confirmed.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/search') },
      ]);
    },
    onError: (err: Error) => Alert.alert('Checkout failed', err.message),
  });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Checkout" subtitle="Shipping details" showBack />

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {(
          [
            'shippingName',
            'shippingPhone',
            'shippingAddress',
            'shippingCity',
            'shippingPincode',
          ] as const
        ).map((field) => (
          <View key={field}>
            <Text style={[styles.label, { color: colors.muted }]}>
              {field
                .replace('shipping', '')
                .replace(/([A-Z])/g, ' $1')
                .trim()}
            </Text>
            <TextInput
              value={form[field]}
              onChangeText={(v) => update(field, v)}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              placeholderTextColor={colors.muted}
            />
          </View>
        ))}
        <Button
          label={checkoutMutation.isPending ? 'Processing…' : 'Place order'}
          disabled={checkoutMutation.isPending}
          onPress={() => checkoutMutation.mutate()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 4, textTransform: 'capitalize' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
});
