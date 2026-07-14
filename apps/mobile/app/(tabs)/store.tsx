import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_LABELS, ProductCategory } from '@fitora/shared';
import { Ionicons } from '@expo/vector-icons';
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

const SERVICES_MOCK = [
  { initials: 'AS', name: 'Arjun Sports', service: 'Racket Stringing', rating: '4.9', price: '₹150', color: '#059669' },
  { initials: 'MS', name: 'Master Sports', service: 'Cricket Bat Repair', rating: '4.7', price: '₹200', color: '#2563EB' },
  { initials: 'RS', name: 'Reddy Sports', service: 'Grip Replacement', rating: '4.8', price: '₹80', color: '#D97706' },
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Store</Text>
        <Pressable onPress={() => router.push('/shop/cart')} style={[styles.cartBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="cart-outline" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Search bar */}
      <Pressable style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.muted} />
        <Text style={[styles.searchText, { color: colors.muted }]}>Search gear, services...</Text>
      </Pressable>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.chip, { backgroundColor: category === cat ? colors.primary : colors.card, borderColor: category === cat ? colors.primary : colors.border }]}
            >
              <Text style={[styles.chipLabel, { color: category === cat ? colors.primaryForeground : colors.foreground }]}>
                {cat === 'ALL' ? 'All' : CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.content}>
        {/* Flash Sale Banner */}
        <View style={[styles.flashBanner, { backgroundColor: colors.primary }]}>
          <Text style={styles.flashIcon}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.flashTitle}>Flash Sale</Text>
            <Text style={styles.flashSub}>Up to 40% off on Badminton Gear</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </View>

        {/* Products grid */}
        <View style={styles.sectionGap}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Popular Gear</Text>
          <QueryState
            isLoading={productsQuery.isLoading}
                error={productsQuery.error as Error}
            onRetry={() => productsQuery.refetch()}
          >
            <View style={styles.productGrid}>
              {products.slice(0, 6).map((item) => (
                <Pressable key={item.id} onPress={() => router.push(`/shop/${item.slug}`)} style={styles.productGridItem}>
                  <ProductCard product={item} onPress={() => router.push(`/shop/${item.slug}`)} />
                </Pressable>
              ))}
              {products.length === 0 && !productsQuery.isLoading && (
                <Text style={[styles.empty, { color: colors.muted }]}>No products found</Text>
              )}
            </View>
          </QueryState>
        </View>

        {/* Services Near You */}
        <View style={styles.sectionGap}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Services Near You</Text>
          <View style={styles.serviceList}>
            {SERVICES_MOCK.map((s, i) => (
              <View key={i} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.serviceAvatar, { backgroundColor: s.color }]}>
                  <Text style={styles.serviceAvatarText}>{s.initials}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, { color: colors.foreground }]}>{s.service}</Text>
                  <Text style={[styles.serviceProvider, { color: colors.muted }]}>{s.name} · ⭐{s.rating}</Text>
                  <Text style={[styles.servicePrice, { color: colors.primary }]}>From {s.price}</Text>
                </View>
                <Pressable style={[styles.bookBtn, { borderColor: colors.primary }]}>
                  <Text style={[styles.bookBtnText, { color: colors.primary }]}>Book</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.hero, fontWeight: '800' },
  cartBtn: { width: 40, height: 40, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  searchText: { flex: 1, fontSize: FontSize.md },
  chipsScroll: { marginBottom: Spacing.md },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingRight: Spacing.xxl },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1 },
  chipLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.lg },
  flashBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.xl },
  flashIcon: { fontSize: 28 },
  flashTitle: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  flashSub: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  sectionGap: { marginBottom: Spacing.xxl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  productGridItem: { width: '47%' },
  empty: { textAlign: 'center', paddingTop: 40 },
  serviceList: { gap: Spacing.sm },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  serviceAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  serviceAvatarText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: FontSize.md, fontWeight: '700' },
  serviceProvider: { fontSize: FontSize.xs, marginTop: 2 },
  servicePrice: { fontSize: FontSize.sm, fontWeight: '700', marginTop: 2 },
  bookBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1.5 },
  bookBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
});
