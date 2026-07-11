import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCurrency, CATEGORY_LABELS, type Product, type ProductCategory } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FontSize, Radius, Spacing } from '@/constants/theme';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { colors } = useTheme();
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);

  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      <Card padded={false}>
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.mutedBg }]}>
          <Text style={styles.emoji}>🛍️</Text>
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Badge label="Sale" variant="danger" />
            </View>
          )}
        </View>
        <View style={styles.content}>
          <Badge label={CATEGORY_LABELS[product.category as ProductCategory]} variant="default" />
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>
              {formatCurrency(Number(product.price))}
            </Text>
            {hasDiscount && (
              <Text style={[styles.compare, { color: colors.muted }]}>
                {formatCurrency(Number(product.compareAtPrice))}
              </Text>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: '46%' },
  imagePlaceholder: {
    height: 120,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 36 },
  discountBadge: { position: 'absolute', top: Spacing.sm, left: Spacing.sm },
  content: { padding: Spacing.md, gap: Spacing.xs },
  name: { fontSize: FontSize.sm, fontWeight: '600', minHeight: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  price: { fontSize: FontSize.md, fontWeight: '800' },
  compare: { fontSize: FontSize.sm, textDecorationLine: 'line-through' },
});
