import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { Button } from '@/components/ui/button';
import { FontSize, Spacing } from '@/constants/theme';

interface EmptyCommunityProps {
  emoji?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyCommunity({
  emoji = '🏸',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyCommunityProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xxxl },
  emoji: { fontSize: 48, marginBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '900', textAlign: 'center' },
  message: { fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.sm, textAlign: 'center' },
  btn: { marginTop: Spacing.lg },
});
