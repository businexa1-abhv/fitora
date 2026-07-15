import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { getCart, removeCartItem, updateCartItem } from '@/lib/shop';
import { FontSize, Spacing } from '@/constants/theme';

export default function CartScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ['shop', 'cart'],
    queryFn: () => getCart(token!),
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(token!, itemId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop', 'cart'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeCartItem(token!, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop', 'cart'] }),
  });

  const items = cartQuery.data?.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity,
    0,
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Cart" subtitle={`${items.length} item(s)`} showBack />

      <QueryState
        isLoading={cartQuery.isLoading}
        isError={cartQuery.isError}
        error={cartQuery.error as Error}
        onRetry={() => cartQuery.refetch()}
      >
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>Your cart is empty</Text>
          }
          renderItem={({ item }) => (
            <Card>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {item.product?.name ?? 'Product'}
              </Text>
              <Text style={[styles.price, { color: colors.primary }]}>
                {formatCurrency(Number(item.product?.price ?? 0))}
              </Text>
              <View style={styles.row}>
                <Pressable
                  onPress={() =>
                    item.quantity > 1
                      ? updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                      : removeMutation.mutate(item.id)
                  }
                  style={[styles.qtyBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground }}>−</Text>
                </Pressable>
                <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                <Pressable
                  onPress={() =>
                    updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })
                  }
                  style={[styles.qtyBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground }}>+</Text>
                </Pressable>
                <Pressable onPress={() => removeMutation.mutate(item.id)}>
                  <Text style={{ color: colors.danger }}>Remove</Text>
                </Pressable>
              </View>
            </Card>
          )}
        />

        {items.length > 0 && (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + Spacing.lg,
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.muted }]}>Subtotal</Text>
              <Text style={[styles.total, { color: colors.foreground }]}>
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <Button label="Checkout" onPress={() => router.push('/shop/checkout')} />
          </View>
        )}
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.md },
  name: { fontSize: FontSize.md, fontWeight: '700' },
  price: { fontSize: FontSize.lg, fontWeight: '800', marginVertical: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontSize: FontSize.md, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  empty: { textAlign: 'center', paddingTop: 40 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: FontSize.sm },
  total: { fontSize: FontSize.xl, fontWeight: '800' },
});
