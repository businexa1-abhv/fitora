import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SPORT_LABELS, SportType, formatCurrency, type Court } from '@fitora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { SPORT_COLORS, SPORT_EMOJI } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    <Pressable onPress={() => router.push(`/court/${court.id}`)}>
      <Card style={compact ? styles.compact : undefined}>
        <View style={styles.row}>
          <View style={[styles.emojiBox, { backgroundColor: `${sportColor}18` }]}>
            <Text style={styles.emoji}>{SPORT_EMOJI[sport]}</Text>
          </View>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {court.name}
              </Text>
              <Badge label={SPORT_LABELS[sport]} variant="primary" />
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
                {court.city} · {court.address}
              </Text>
            </View>
            {!compact && court.amenities.length > 0 && (
              <Text style={[styles.amenities, { color: colors.muted }]} numberOfLines={1}>
                {court.amenities.slice(0, 3).join(' · ')}
              </Text>
            )}
            <Text style={[styles.price, { color: colors.primary }]}>
              From {formatCurrency(priceFrom)}/hr
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compact: { marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  content: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: FontSize.md, fontWeight: '700', flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: FontSize.sm, flex: 1 },
  amenities: { fontSize: FontSize.xs },
  price: { fontSize: FontSize.sm, fontWeight: '700', marginTop: 2 },
});
