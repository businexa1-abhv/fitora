import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAME } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export function AuthHero({
  title,
  subtitle,
  artworkSource,
  artworkLabel,
  stepCurrent,
  stepTotal,
  children,
}: {
  title: string;
  subtitle?: string;
  artworkSource?: ImageSourcePropType;
  artworkLabel?: string;
  stepCurrent?: number;
  stepTotal?: number;
  children: React.ReactNode;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const showStep = Boolean(stepCurrent && stepTotal);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.heroFrom, colors.background] : [colors.heroFrom, '#fff7f2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + Spacing.xl }]}
      >
        <View style={styles.topRow}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          {showStep ? (
            <Text style={styles.stepText}>Step {stepCurrent} of {stepTotal}</Text>
          ) : null}
        </View>
        {showStep ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, ((stepCurrent ?? 0) / (stepTotal ?? 1)) * 100)}%` },
              ]}
            />
          </View>
        ) : null}
        {artworkSource ? (
          <View style={styles.artworkCard}>
            <Image
              source={artworkSource}
              accessibilityLabel={artworkLabel}
              resizeMode="contain"
              style={styles.artwork}
            />
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </LinearGradient>
      <View style={[styles.body, { paddingBottom: insets.bottom + Spacing.xl }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  brand: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stepText: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.xs, fontWeight: '800' },
  progressTrack: {
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full, backgroundColor: '#fff' },
  artworkCard: {
    height: 156,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  artwork: { width: '100%', height: '100%' },
  title: {
    color: '#fff',
    fontSize: FontSize.hero,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
});
