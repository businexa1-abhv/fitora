import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPORT_LABELS, SportType, formatCurrency, type Court } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { SPORT_COLORS, SPORT_EMOJI } from '@/lib/constants';
import { getCourt } from '@/lib/courts';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const DEFAULT_AMENITIES = ['High-Speed WiFi', 'Free Parking', 'Private Showers', 'Full AC'];

function getPrimaryImage(court: Court) {
  const primary =
    court.images.find((image) => typeof image !== 'string' && image.isPrimary) ?? court.images[0];
  return typeof primary === 'string' ? primary : primary?.url;
}

function getAmenityIcon(label: string): IconName {
  const normalized = label.toLowerCase();
  if (normalized.includes('wifi')) return 'wifi';
  if (normalized.includes('parking')) return 'car-sport-outline';
  if (normalized.includes('shower') || normalized.includes('wash')) return 'water-outline';
  if (normalized.includes('ac') || normalized.includes('air')) return 'snow-outline';
  if (normalized.includes('coach')) return 'school-outline';
  if (normalized.includes('locker')) return 'lock-closed-outline';
  return 'checkmark-circle-outline';
}

function priceOrFallback(value?: string | null) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : 499;
}

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
        <View style={[styles.miniHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={() => router.back()} style={styles.roundButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🏟️</Text>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>
            This venue could not be loaded.
          </Text>
        </View>
      </View>
    );
  }

  const sport: SportType = (court?.sportType as SportType | null) ?? SportType.OTHER;
  const sportColor = SPORT_COLORS[sport];
  const imageUrl = court ? getPrimaryImage(court) : undefined;
  const amenities = court?.amenities.length ? court.amenities : DEFAULT_AMENITIES;
  const startingPrice = priceOrFallback(court?.defaultSlotPrice);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <QueryState
        isLoading={courtQuery.isLoading}
        isError={courtQuery.isError}
        error={courtQuery.error as Error}
        onRetry={() => courtQuery.refetch()}
      >
        {court && (
          <>
            <ScrollView
              contentContainerStyle={{ paddingBottom: insets.bottom + 142 }}
              showsVerticalScrollIndicator={false}
            >
              {imageUrl ? (
                <ImageBackground
                  source={{ uri: imageUrl }}
                  style={styles.hero}
                  imageStyle={styles.heroImage}
                >
                  <View style={styles.heroShade} />
                  <HeroChrome top={insets.top} />
                </ImageBackground>
              ) : (
                <View style={[styles.hero, { backgroundColor: `${sportColor}25` }]}>
                  <HeroChrome top={insets.top} />
                  <Text style={styles.heroEmoji}>{SPORT_EMOJI[sport]}</Text>
                </View>
              )}

              <View style={styles.content}>
                <View style={styles.titleBlock}>
                  <View style={styles.nameRow}>
                    <View style={styles.nameWrap}>
                      <Text style={[styles.venueName, { color: colors.foreground }]}>
                        {court.name}
                      </Text>
                      <View style={styles.metaRow}>
                        <Ionicons name="star" size={18} color="#FFDB17" />
                        <Text style={[styles.ratingStrong, { color: colors.foreground }]}>4.9</Text>
                        <Text style={[styles.metaText, { color: colors.muted }]}>
                          (124 Reviews)
                        </Text>
                        <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                        <Ionicons name="location-outline" size={16} color={colors.muted} />
                        <Text style={[styles.metaText, { color: colors.muted }]}>1.2 km away</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.badgesRow}>
                    <Badge label={SPORT_LABELS[sport]} variant="primary" />
                    <Badge label="Top Rated" variant="success" />
                  </View>
                </View>

                <View style={styles.tabsRow}>
                  <Text
                    style={[
                      styles.activeTab,
                      { color: colors.primary, borderBottomColor: colors.primary },
                    ]}
                  >
                    Overview
                  </Text>
                  <Text style={[styles.tab, { color: colors.muted }]}>Book</Text>
                  <Text style={[styles.tab, { color: colors.muted }]}>Reviews</Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    About Venue
                  </Text>
                  <Text style={[styles.description, { color: colors.muted }]}>
                    {court.description ??
                      `Experience premium ${SPORT_LABELS[sport].toLowerCase()} sessions at ${court.name}. The venue is designed for focused play, dependable slots and a comfortable match-day flow.`}
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Amenities</Text>
                  <View style={styles.amenityGrid}>
                    {amenities.slice(0, 8).map((amenity) => (
                      <View
                        key={amenity}
                        style={[
                          styles.amenityCard,
                          { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                      >
                        <Ionicons name={getAmenityIcon(amenity)} size={24} color={colors.accent} />
                        <Text style={[styles.amenityText, { color: colors.foreground }]}>
                          {amenity}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View
                    style={[
                      styles.infoCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      Operating Hours
                    </Text>
                    <HoursRow label="Monday - Friday" value="6 AM - 11 PM" />
                    <HoursRow label="Saturday" value="7 AM - 10 PM" />
                    <HoursRow label="Sunday" value="8 AM - 8 PM" noBorder />
                  </View>
                  <Pressable
                    style={[
                      styles.mapCard,
                      { backgroundColor: `${sportColor}18`, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="navigate-circle" size={42} color={colors.accent} />
                    <Text style={[styles.mapTitle, { color: colors.foreground }]}>
                      Get Directions
                    </Text>
                    <Text style={[styles.mapAddress, { color: colors.muted }]} numberOfLines={2}>
                      {court.address}, {court.city}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.border,
                  paddingBottom: insets.bottom + Spacing.md,
                },
              ]}
            >
              <View>
                <Text style={[styles.priceLabel, { color: colors.muted }]}>Starting from</Text>
                <Text style={[styles.priceValue, { color: colors.foreground }]}>
                  {formatCurrency(startingPrice)}
                  <Text style={[styles.priceUnit, { color: colors.muted }]}>/hr</Text>
                </Text>
              </View>
              <Button
                label="Book a slot"
                onPress={() => router.push(`/booking/${court.id}`)}
                style={styles.ctaButton}
              />
            </View>
          </>
        )}
      </QueryState>
    </View>
  );
}

function HeroChrome({ top }: { top: number }) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.heroChrome, { paddingTop: top + Spacing.sm }]}>
      <Pressable onPress={() => router.back()} style={[styles.roundButton, styles.glassButton]}>
        <Ionicons name="chevron-back" size={24} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.brand, { color: colors.accent }]}>FitOra</Text>
      <View style={styles.headerActions}>
        <Pressable style={[styles.roundButton, styles.glassButton]}>
          <Ionicons name="share-social-outline" size={20} color={colors.foreground} />
        </Pressable>
        <Pressable style={[styles.roundButton, styles.glassButton]}>
          <Ionicons name="heart-outline" size={20} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

function HoursRow({
  label,
  value,
  noBorder,
}: {
  label: string;
  value: string;
  noBorder?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.hoursRow,
        !noBorder && { borderBottomColor: colors.border, borderBottomWidth: 1 },
      ]}
    >
      <Text style={[styles.hoursLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.hoursValue, { color: colors.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  miniHeader: { paddingHorizontal: Spacing.xl },
  hero: { height: 360, justifyContent: 'space-between', overflow: 'hidden' },
  heroImage: { resizeMode: 'cover' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  heroChrome: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    position: 'relative',
    zIndex: 2,
  },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  roundButton: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  glassButton: { backgroundColor: 'rgba(255,255,255,0.86)' },
  brand: { fontSize: FontSize.xl, fontWeight: '900' },
  heroEmoji: { alignSelf: 'center', fontSize: 104, marginBottom: 92 },
  content: { gap: Spacing.xxl, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl },
  titleBlock: { gap: Spacing.lg },
  nameRow: { flexDirection: 'row', gap: Spacing.md },
  nameWrap: { flex: 1 },
  venueName: { fontSize: 34, fontWeight: '900', lineHeight: 40 },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: Spacing.sm,
  },
  ratingStrong: { fontSize: FontSize.sm, fontWeight: '900' },
  metaText: { fontSize: FontSize.sm, fontWeight: '600' },
  metaDot: { borderRadius: Radius.full, height: 4, marginHorizontal: 4, width: 4 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tabsRow: {
    borderBottomWidth: 1,
    borderColor: 'rgba(142,113,100,0.18)',
    flexDirection: 'row',
    gap: Spacing.xxl,
  },
  activeTab: {
    borderBottomWidth: 2,
    fontSize: FontSize.md,
    fontWeight: '900',
    paddingBottom: Spacing.md,
  },
  tab: { fontSize: FontSize.md, fontWeight: '800', paddingBottom: Spacing.md },
  section: { gap: Spacing.md },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '900' },
  description: { fontSize: FontSize.md, lineHeight: 24 },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  amenityCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    minHeight: 116,
    padding: Spacing.lg,
    width: '47.5%',
  },
  amenityText: { fontSize: FontSize.sm, fontWeight: '800', textAlign: 'center' },
  infoGrid: { gap: Spacing.lg },
  infoCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md },
  hoursLabel: { fontSize: FontSize.sm, fontWeight: '700' },
  hoursValue: { fontSize: FontSize.sm, fontWeight: '900' },
  mapCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  mapTitle: { fontSize: FontSize.lg, fontWeight: '900' },
  mapAddress: { fontSize: FontSize.sm, lineHeight: 20, textAlign: 'center' },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    position: 'absolute',
    right: 0,
  },
  priceLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  priceValue: { fontSize: FontSize.xl, fontWeight: '900' },
  priceUnit: { fontSize: FontSize.sm, fontWeight: '700' },
  ctaButton: { minWidth: 180 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFoundEmoji: { fontSize: 48 },
  notFoundText: { fontSize: FontSize.md },
});
