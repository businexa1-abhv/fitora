import { StyleSheet, Text, View, type TextProps, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}
      {...props}
    />
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'primary' ? colors.primary : variant === 'outline' ? colors.card : 'transparent';
  const text = variant === 'primary' ? colors.primaryForeground : colors.primary;
  const border = variant === 'outline' ? colors.primary : 'transparent';

  return (
    <View style={{ opacity: disabled ? 0.5 : 1 }}>
      <Text
        onPress={disabled ? undefined : onPress}
        style={[
          styles.button,
          {
            backgroundColor: bg,
            borderColor: border,
            color: text,
            borderWidth: variant === 'outline' ? 1.5 : 0,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function MonoLabel({ children, style, ...props }: TextProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.mono, { color: colors.muted }, style]} {...props}>
      {children}
    </Text>
  );
}

export function QueryState({
  isLoading,
  isError,
  error,
  onRetry,
  children,
  empty,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRetry?: () => void;
  children: React.ReactNode;
  empty?: boolean;
}) {
  const { colors } = useTheme();
  if (isLoading) {
    return (
      <View style={styles.stateBox}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.stateBox}>
        <Text style={{ color: colors.danger, marginBottom: Spacing.sm }}>
          {error?.message ?? 'Something went wrong'}
        </Text>
        {onRetry ? (
          <Text onPress={onRetry} style={{ color: colors.primary, fontWeight: '700' }}>
            Retry
          </Text>
        ) : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.stateBox}>
        <Text style={{ color: colors.muted }}>Nothing here yet.</Text>
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  button: {
    borderRadius: Radius.xl,
    fontSize: FontSize.md,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    textAlign: 'center',
  },
  mono: {
    fontFamily: 'Courier',
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
});
