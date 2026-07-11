import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_LABELS, ProductCategory } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { ProductCard } from '@/components/product-card';
import { QueryState } from '@/components/query-state';
import { getProducts } from '@/lib/shop';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const CATEGORIES: (ProductCategory | 'ALL')[] = [
  'ALL',
  ProductCategory.GEAR,
  ProductCategory.APPAREL,
  ProductCategory.TROPHIES,
  ProductCategory.ACCESSORIES,
];

export default function StoreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<ProductCategory | 'ALL'>('ALL');

  const productsQuery = useQuery({
    queryKey: ['shop', 'products', category],
    queryFn: () =>
      getProducts({
        category: category === 'ALL' ? undefined : category,
      }),
  });

  const products = productsQuery.data?.items ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Sports store</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Gear, apparel, trophies & more</Text>
          </View>
          <Pressable onPress={() => router.push('/shop/cart')} style={[styles.cartBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>Cart</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <View style={styles.filterRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[
                styles.chip,
                {
                  backgroundColor: category === cat ? colors.primary : colors.card,
                  borderColor: category === cat ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: category === cat ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {cat === 'ALL' ? 'All' : CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <QueryState
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        error={productsQuery.error as Error}
        onRetry={() => productsQuery.refetch()}
      >
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => router.push(`/shop/${item.slug}`)} />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>No products found</Text>
          }
        />
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cartBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1 },
  title: { fontSize: FontSize.hero, fontWeight: '800' },
  subtitle: { fontSize: FontSize.md, marginTop: 4 },
  filters: { maxHeight: 44, marginBottom: Spacing.md },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  row: { gap: Spacing.md },
  empty: { textAlign: 'center', paddingTop: 40 },
});
