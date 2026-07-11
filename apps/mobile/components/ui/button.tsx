import { Pressable, StyleSheet, Text, type PressableProps, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  fullWidth,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();

  const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: { backgroundColor: colors.primary },
      text: { color: colors.primaryForeground },
    },
    secondary: {
      container: { backgroundColor: colors.primaryLight },
      text: { color: colors.primary },
    },
    outline: {
      container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
      text: { color: colors.foreground },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: colors.primary },
    },
  };

  const sizeStyles = {
    sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, fontSize: FontSize.sm },
    md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, fontSize: FontSize.md },
    lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, fontSize: FontSize.lg },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        v.container,
        { paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal },
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style as ViewStyle,
      ]}
      disabled={disabled}
      {...props}
    >
      <Text style={[styles.label, v.text, { fontSize: s.fontSize }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  label: { fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
