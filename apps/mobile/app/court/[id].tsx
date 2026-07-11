import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPORT_LABELS, SportType, formatCurrency } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { SPORT_COLORS, SPORT_EMOJI } from '@/lib/constants';
import { getCourt } from '@/lib/courts';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function CourtDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const courtQuery = useQuery({
    queryKey: ['court', id],
    queryFn: () => getCourt(id!, token ?? undefined),
    enabled: !!id,
  });

  const court = courtQuery.data;

  if (!courtQuery.isLoading && !court) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Court not found" showBack />
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🏟️</Text>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>This venue could not be loaded.</Text>
        </View>
      </View>
    );
  }

  const sport: SportType = (court?.sportType as SportType | null) ?? SportType.OTHER;
  const sportColor = SPORT_COLORS[sport];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={court?.name ?? 'Venue'} subtitle={court?.city} showBack />

      <QueryState
        isLoading={courtQuery.isLoading}
        isError={courtQuery.isError}
        error={courtQuery.error as Error}
        onRetry={() => courtQuery.refetch()}
      >
        {court && (
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.hero, { backgroundColor: `${sportColor}20` }]}>
              <Text style={styles.heroEmoji}>{SPORT_EMOJI[sport]}</Text>
              <Badge label={SPORT_LABELS[sport]} variant="primary" />
            </View>

            <View style={styles.content}>
              <Card>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.muted }]}>Address</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>
                      {court.address}, {court.city}
                    </Text>
                  </View>
                </View>
                {court.description && (
                  <Text style={[styles.description, { color: colors.muted }]}>{court.description}</Text>
                )}
              </Card>

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Amenities</Text>
              <View style={styles.amenities}>
                {court.amenities.map((a) => (
                  <View key={a} style={[styles.amenityChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    <Text style={[styles.amenityText, { color: colors.foreground }]}>{a}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actions}>
                <Button label="Book a slot" fullWidth onPress={() => router.push(`/booking/${court.id}`)} />
                <Button
                  label="View membership plans"
                  variant="outline"
                  fullWidth
                  style={{ marginTop: Spacing.sm }}
                  onPress={() => router.push({ pathname: '/membership', params: { courtId: court.id } })}
                />
              </View>
            </View>
          </ScrollView>
        )}
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.md },
  heroEmoji: { fontSize: 64 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  infoRow: { flexDirection: 'row', gap: Spacing.md },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: FontSize.md, fontWeight: '600', marginTop: 2 },
  description: { fontSize: FontSize.sm, marginTop: Spacing.md, lineHeight: 20 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  amenityText: { fontSize: FontSize.sm, fontWeight: '600' },
  actions: { marginTop: Spacing.md },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFoundEmoji: { fontSize: 48 },
  notFoundText: { fontSize: FontSize.md },
});
