import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { Radius, Spacing } from '@/constants/theme';

interface CardProps extends ViewProps {
  padded?: boolean;
}

export function Card({ children, style, padded = true, ...props }: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          padding: padded ? Spacing.lg : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
});
