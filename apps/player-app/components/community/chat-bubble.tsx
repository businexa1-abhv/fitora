import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CommunityMessage } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { ReactionBar } from '@/components/community/reaction-bar';
import { FontSize, Radius, Spacing } from '@/constants/theme';

interface ChatBubbleProps {
  message: CommunityMessage;
  isMine: boolean;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onLongPress?: () => void;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function ChatBubble({ message, isMine, onReply, onReact, onLongPress }: ChatBubbleProps) {
  const { colors } = useTheme();
  const authorName = `${message.author.firstName} ${message.author.lastName}`.trim();

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}
    >
      <View
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderBottomLeftRadius: 4,
              },
        ]}
      >
        {!isMine && <Text style={[styles.author, { color: colors.accent }]}>{authorName}</Text>}
        {message.replyPreview ? (
          <View
            style={[
              styles.reply,
              { backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : colors.mutedBg },
            ]}
          >
            <Text style={[styles.replyAuthor, { color: isMine ? '#fff' : colors.primary }]}>
              {message.replyPreview.authorName}
            </Text>
            <Text
              style={[
                styles.replyBody,
                { color: isMine ? 'rgba(255,255,255,0.85)' : colors.muted },
              ]}
              numberOfLines={2}
            >
              {message.replyPreview.body ?? 'Media'}
            </Text>
          </View>
        ) : null}
        {message.mediaUrl ? (
          <Text
            style={[styles.media, { color: isMine ? '#fff' : colors.foreground }]}
            numberOfLines={1}
          >
            📎 {message.mediaUrl}
          </Text>
        ) : null}
        {message.body ? (
          <Text
            style={[styles.body, { color: isMine ? colors.primaryForeground : colors.foreground }]}
          >
            {message.body}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <Text style={[styles.time, { color: isMine ? 'rgba(255,255,255,0.75)' : colors.muted }]}>
            {formatTime(message.createdAt)}
          </Text>
          {message.isPinned ? <Text style={styles.pin}>📌</Text> : null}
        </View>
        {message.reactions.length > 0 && (
          <ReactionBar reactions={message.reactions} compact onReact={onReact} />
        )}
      </View>
      {onReply && (
        <Pressable onPress={onReply} hitSlop={8}>
          <Text style={[styles.replyAction, { color: colors.muted }]}>Reply</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: Spacing.sm, maxWidth: '82%' },
  rowMine: { alignSelf: 'flex-end' },
  rowOther: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: Radius.lg,
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  author: { fontSize: FontSize.xs, fontWeight: '800' },
  reply: { borderRadius: Radius.sm, marginBottom: 4, padding: Spacing.sm },
  replyAuthor: { fontSize: FontSize.xs, fontWeight: '800' },
  replyBody: { fontSize: FontSize.xs, marginTop: 2 },
  media: { fontSize: FontSize.sm, fontWeight: '600' },
  body: { fontSize: FontSize.md, lineHeight: 21 },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  time: { fontSize: FontSize.xs, fontWeight: '600' },
  pin: { fontSize: 10 },
  replyAction: { fontSize: FontSize.xs, fontWeight: '700', marginTop: 4, textAlign: 'right' },
});
