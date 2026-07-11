import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_LABELS, formatCurrency, type ProductCategory } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { addToCart, getProduct } from '@/lib/shop';
import { FontSize, Spacing } from '@/constants/theme';

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const productQuery = useQuery({
    queryKey: ['shop', 'product', slug],
    queryFn: () => getProduct(slug!),
    enabled: !!slug,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Sign in required');
      return addToCart(token, productQuery.data!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop', 'cart'] });
      Alert.alert('Added to cart', 'Item added successfully.', [
        { text: 'Continue shopping', style: 'cancel' },
        { text: 'View cart', onPress: () => router.push('/shop/cart') },
      ]);
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const product = productQuery.data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Product" showBack />

      <QueryState
        isLoading={productQuery.isLoading}
        isError={productQuery.isError}
        error={productQuery.error as Error}
        onRetry={() => productQuery.refetch()}
      >
        {product ? (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          >
            <View style={[styles.image, { backgroundColor: colors.mutedBg }]}>
              <Text style={styles.emoji}>🛍️</Text>
            </View>
            <Badge label={CATEGORY_LABELS[product.category as ProductCategory]} variant="primary" />
            <Text style={[styles.name, { color: colors.foreground }]}>{product.name}</Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              {formatCurrency(Number(product.price))}
            </Text>
            {product.description ? (
              <Text style={[styles.description, { color: colors.muted }]}>{product.description}</Text>
            ) : null}
            <Button
              label={addMutation.isPending ? 'Adding…' : 'Add to cart'}
              disabled={addMutation.isPending}
              onPress={() => addMutation.mutate()}
            />
          </ScrollView>
        ) : null}
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  image: {
    height: 200,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emoji: { fontSize: 64 },
  name: { fontSize: FontSize.xxl, fontWeight: '800' },
  price: { fontSize: FontSize.xl, fontWeight: '800' },
  description: { fontSize: FontSize.md, lineHeight: 22 },
});
