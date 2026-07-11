import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href: Href;
  color?: string;
}

export function QuickAction({ icon, label, href, color }: QuickActionProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const iconColor = color ?? colors.primary;

  return (
    <Pressable
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.wrapper, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

interface HeroBannerProps {
  title: string;
  subtitle: string;
}

export function HeroBanner({ title, subtitle }: HeroBannerProps) {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[colors.heroFrom, colors.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: 72,
    gap: Spacing.sm,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  hero: {
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    color: '#fff',
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.md,
    lineHeight: 22,
  },
});
