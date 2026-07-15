import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SERVICE_CATEGORY_LABELS, formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/query-state';
import { getPrintListings, getServiceListings } from '@/lib/shop';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  STRINGING: 'tennisball',
  BAT_REPAIR: 'hammer',
  EQUIPMENT_REPAIR: 'build',
  CUSTOM_PRINT: 'shirt',
  OTHER: 'construct',
};

export default function ServicesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const servicesQuery = useQuery({
    queryKey: ['services', 'listings'],
    queryFn: () => getServiceListings(),
  });

  const printQuery = useQuery({
    queryKey: ['print', 'listings'],
    queryFn: () => getPrintListings(),
  });

  const items = [
    ...(servicesQuery.data?.items ?? []).map((s) => ({ ...s, kind: 'service' as const })),
    ...(printQuery.data?.items ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      category: 'CUSTOM_PRINT',
      city: p.city,
      price: p.price,
      kind: 'print' as const,
    })),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Sports services" subtitle="Stringing, repair & custom print" showBack />

      <QueryState
        isLoading={servicesQuery.isLoading || printQuery.isLoading}
        isError={servicesQuery.isError || printQuery.isError}
        error={(servicesQuery.error ?? printQuery.error) as Error}
        onRetry={() => {
          servicesQuery.refetch();
          printQuery.refetch();
        }}
      >
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>No services available</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push(item.kind === 'print' ? `/print/${item.id}` : `/services/${item.id}`)
              }
            >
              <Card>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons
                      name={CATEGORY_ICONS[item.category] ?? 'construct'}
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
                    <Text style={[styles.meta, { color: colors.muted }]}>
                      {SERVICE_CATEGORY_LABELS[
                        item.category as keyof typeof SERVICE_CATEGORY_LABELS
                      ] ?? item.category}{' '}
                      · {item.city}
                    </Text>
                  </View>
                  <Badge label={item.kind === 'print' ? 'Print' : 'Service'} variant="primary" />
                </View>
                <Text style={[styles.price, { color: colors.primary }]}>
                  {formatCurrency(Number(item.price))}
                </Text>
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
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  cardTop: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  title: { fontSize: FontSize.md, fontWeight: '800' },
  meta: { fontSize: FontSize.sm, marginTop: 2 },
  price: { fontSize: FontSize.lg, fontWeight: '800' },
  empty: { textAlign: 'center', paddingTop: 40 },
});
