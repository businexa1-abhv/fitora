import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SPORT_LABELS, SportType, formatCurrency, type Court } from '@fitora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { SPORT_COLORS, SPORT_EMOJI } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { FontSize, Radius, Spacing } from '@/constants/theme';

interface CourtCardProps {
  court: Court;
  priceFrom?: number;
  compact?: boolean;
}

export function CourtCard({ court, priceFrom = 400, compact }: CourtCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const sport: SportType = (court.sportType as SportType | null) ?? SportType.OTHER;
  const sportColor = SPORT_COLORS[sport];

  return (
    <Pressable
      onPress={() => router.push(`/court/${court.id}`)}
      style={({ pressed }) => [
        styles.wrapper,
        compact && styles.compact,
        pressed && styles.pressed,
      ]}
    >
      <Card padded={false} style={styles.card}>
        <View style={[styles.visual, { backgroundColor: `${sportColor}24` }]}>
          <Text style={styles.emoji}>{SPORT_EMOJI[sport]}</Text>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={13} color="#FFDB17" />
            <Text style={styles.ratingText}>4.8</Text>
          </View>
          <View style={[styles.sportPill, { backgroundColor: colors.accent }]}>
            <Text style={styles.sportPillText}>{SPORT_LABELS[sport]}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {court.name}
            </Text>
            <Text style={[styles.distance, { color: colors.muted }]}>2.4 km</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
              {court.city} · {court.address}
            </Text>
          </View>
          {!compact && court.amenities.length > 0 && (
            <Text style={[styles.amenities, { color: colors.muted }]} numberOfLines={1}>
              {court.amenities.slice(0, 3).join(' · ')}
            </Text>
          )}
          <View style={styles.footer}>
            <View>
              <Text style={[styles.fromLabel, { color: colors.muted }]}>Starting from</Text>
              <Text style={[styles.price, { color: colors.foreground }]}>
                {formatCurrency(priceFrom)}
                <Text style={[styles.perHour, { color: colors.muted }]}>/hr</Text>
              </Text>
            </View>
            <View style={[styles.bookNow, { backgroundColor: colors.accent }]}>
              <Text style={styles.bookNowText}>Book Now</Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.lg },
  compact: { marginBottom: 0 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  card: { borderRadius: 24, overflow: 'hidden' },
  visual: { height: 164, justifyContent: 'center', padding: Spacing.lg },
  emoji: { fontSize: 60 },
  ratingPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
  },
  ratingText: { color: '#191c1d', fontSize: FontSize.xs, fontWeight: '900' },
  sportPill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    bottom: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    position: 'absolute',
  },
  sportPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  body: { padding: Spacing.lg },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  name: { flex: 1, fontSize: FontSize.xl, fontWeight: '900' },
  distance: { fontSize: FontSize.xs, fontWeight: '800', marginTop: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  amenities: { fontSize: FontSize.xs, fontWeight: '600', marginTop: Spacing.sm },
  footer: {
    alignItems: 'center',
    borderTopColor: 'rgba(142,113,100,0.16)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  fromLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  price: { fontSize: FontSize.lg, fontWeight: '900', marginTop: 2 },
  perHour: { fontSize: FontSize.sm, fontWeight: '600' },
  bookNow: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  bookNowText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '900' },
});
