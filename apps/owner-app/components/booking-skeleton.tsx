import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { Radius, Spacing } from '@/constants/theme';

// ─── Single shimmer block ─────────────────────────────────────────────────────

function ShimmerBlock({
  width,
  height,
  borderRadius,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? Radius.sm,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Single card skeleton ─────────────────────────────────────────────────────

export function BookingCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Top row: avatar + name col + status */}
      <View style={styles.topRow}>
        <ShimmerBlock width={38} height={38} borderRadius={Radius.full} />
        <View style={styles.nameCol}>
          <ShimmerBlock width={'70%'} height={11} />
          <ShimmerBlock width={'50%'} height={9} style={{ marginTop: 5 }} />
        </View>
        <View style={styles.rightCol}>
          <ShimmerBlock width={64} height={20} borderRadius={Radius.full} />
          <ShimmerBlock width={44} height={11} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Court row */}
      <View style={styles.courtRow}>
        <ShimmerBlock width={32} height={32} borderRadius={Radius.sm} />
        <View style={styles.courtCol}>
          <ShimmerBlock width={'75%'} height={12} />
          <ShimmerBlock width={'55%'} height={10} style={{ marginTop: 5 }} />
        </View>
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        <ShimmerBlock width={80} height={9} />
        <ShimmerBlock width={56} height={18} borderRadius={Radius.full} />
      </View>
    </View>
  );
}

export function BookingSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      {Array.from({ length: count }).map((_, i) => (
        <BookingCardSkeleton key={i} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  nameCol: {
    flex: 1,
    gap: 4,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
  },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  courtCol: {
    flex: 1,
    gap: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
