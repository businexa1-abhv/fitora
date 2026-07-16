import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { QueryState } from '@/components/query-state';
import { getCart, getProducts } from '@/lib/shop';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function ShopMarketplaceScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const productsQuery = useQuery({
    queryKey: ['shop', 'products'],
    queryFn: () => getProducts({ page: 1 }),
  });

  const cartQuery = useQuery({
    queryKey: ['shop', 'cart'],
    queryFn: () => getCart(token!),
    enabled: !!token,
  });

  const cartCount = cartQuery.data?.items?.length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Marketplace"
        subtitle="Gear, apparel and accessories"
        showBack
        rightAction={
          <Pressable onPress={() => router.push('/shop/cart')} hitSlop={8}>
            <Ionicons name="cart-outline" size={22} color={colors.primary} />
            {cartCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />
      <QueryState
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        error={productsQuery.error as Error}
        onRetry={() => productsQuery.refetch()}
      >
        <FlatList
          data={productsQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            gap: Spacing.md,
            padding: Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xxxl,
          }}
          ListEmptyComponent={
            <Text style={{ color: colors.muted, textAlign: 'center' }}>
              No products in the marketplace yet.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/shop/${item.slug}`)}>
              <Card style={styles.card}>
                <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="bag-handle" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: FontSize.sm }} numberOfLines={1}>
                    {item.category ?? 'Product'}
                  </Text>
                  <Text style={{ color: colors.accent, fontWeight: '800', marginTop: 4 }}>
                    {formatCurrency(Number(item.price))}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            </Pressable>
          )}
        />
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: { fontSize: FontSize.md, fontWeight: '900' },
  badge: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
});
