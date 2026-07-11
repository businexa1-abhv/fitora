import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const { colors, isDark } = useTheme();

  const variants: Record<BadgeVariant, { bg: string; text: string }> = {
    default: { bg: colors.mutedBg, text: colors.muted },
    success: { bg: isDark ? '#0d2818' : '#e8faf1', text: colors.primary },
    warning: { bg: isDark ? '#2a2008' : '#fef3c7', text: colors.warning },
    danger: { bg: isDark ? '#2a1010' : '#fee2e2', text: colors.danger },
    primary: { bg: colors.primaryLight, text: colors.primary },
  };

  const v = variants[variant];

  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
