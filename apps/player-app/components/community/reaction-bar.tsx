import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COMMUNITY_QUICK_REACTIONS } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

interface ReactionBarProps {
  reactions?: Array<{ emoji: string; count: number; reactedByMe: boolean }>;
  compact?: boolean;
  onReact?: (emoji: string) => void;
}

export function ReactionBar({ reactions = [], compact, onReact }: ReactionBarProps) {
  const { colors } = useTheme();

  if (onReact) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tray}
      >
        {COMMUNITY_QUICK_REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => onReact(emoji)}
            style={[styles.emojiBtn, { backgroundColor: colors.mutedBg }]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  if (reactions.length === 0) return null;

  return (
    <View
      style={[
        styles.summary,
        compact && styles.summaryCompact,
        { backgroundColor: colors.mutedBg },
      ]}
    >
      {reactions.map((reaction) => (
        <View
          key={reaction.emoji}
          style={[styles.chip, reaction.reactedByMe && { backgroundColor: colors.primaryLight }]}
        >
          <Text style={styles.emoji}>{reaction.emoji}</Text>
          <Text style={[styles.count, { color: colors.foreground }]}>{reaction.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  emojiBtn: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  emoji: { fontSize: 18 },
  summary: {
    borderRadius: Radius.full,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: Spacing.xs,
    padding: 4,
  },
  summaryCompact: { alignSelf: 'flex-start' },
  chip: {
    alignItems: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  count: { fontSize: FontSize.xs, fontWeight: '800' },
});
