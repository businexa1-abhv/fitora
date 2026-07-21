import { StyleSheet, Text, View } from 'react-native';
import { FontSize, Radius } from '@/constants/theme';
import { getStatusMeta, getTypeMeta } from '@/lib/booking-status';

export function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const cfg = getStatusMeta(status);
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.badgeText, { color: cfg.color }, size === 'sm' && styles.badgeTextSm]}>
        {cfg.label.toUpperCase()}
      </Text>
    </View>
  );
}

export function BookingTypeBadge({ type }: { type: string }) {
  const cfg = getTypeMeta(type);
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgeTextSm: {
    fontSize: 9,
  },
});
