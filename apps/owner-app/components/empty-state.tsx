import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export function EmptyState({
  icon,
  title,
  message,
  ctaLabel,
  onCta,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainer }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={{ color: colors.muted, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
      {ctaLabel && onCta ? (
        <Pressable onPress={onCta} style={[styles.cta, { backgroundColor: colors.primary }]}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 56,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    width: 56,
  },
  title: { fontSize: FontSize.lg, fontWeight: '800', textAlign: 'center' },
  cta: {
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  ctaText: { color: '#fff', fontWeight: '800' },
});
