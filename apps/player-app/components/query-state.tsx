import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { FitoraLoader } from '@/components/fitora-loader';
import { FontSize, Spacing } from '@/constants/theme';

interface QueryStateProps {
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function QueryState({ isLoading, isError, error, onRetry, children }: QueryStateProps) {
  const { colors } = useTheme();

  if (isLoading) {
    return <FitoraLoader variant="screen" />;
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={[styles.error, { color: colors.danger }]}>
          {error?.message ?? 'Failed to load'}
        </Text>
        {onRetry && (
          <Pressable onPress={onRetry} style={[styles.retry, { borderColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>Retry</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  error: { fontSize: FontSize.md, textAlign: 'center', marginBottom: Spacing.md },
  retry: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
