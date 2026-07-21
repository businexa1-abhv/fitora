import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { COMMUNITY_QUICK_REPLIES, type CommunityMessage } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { ChatBubble } from '@/components/community/chat-bubble';
import { ReactionBar } from '@/components/community/reaction-bar';
import { useCommunityChatLive } from '@/hooks/use-community-chat-live';
import { emitCommunityTyping } from '@/lib/community-realtime';
import { getMessages, reactMessage, sendMessage } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useCommunityChatLive(groupId, token);

  const messagesQuery = useQuery({
    queryKey: ['community', 'messages', groupId],
    queryFn: () => getMessages(token!, groupId!),
    enabled: !!token && !!groupId,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { body: string; replyToId?: string }) =>
      sendMessage(token!, groupId!, payload),
    onSuccess: () => {
      setDraft('');
      setReplyTo(null);
      void queryClient.invalidateQueries({ queryKey: ['community', 'messages', groupId] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: (payload: { messageId: string; emoji: string }) =>
      reactMessage(token!, payload.messageId, payload.emoji),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community', 'messages', groupId] });
      setShowReactions(false);
    },
  });

  const handleTyping = useCallback(
    (value: string) => {
      setDraft(value);
      if (!groupId) return;
      emitCommunityTyping(token, groupId, value.length > 0);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => emitCommunityTyping(token, groupId, false), 1200);
    },
    [groupId, token],
  );

  const messages = messagesQuery.data ?? [];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScreenHeader title="Group Chat" showBack />
      <QueryState
        isLoading={messagesQuery.isLoading}
        isError={messagesQuery.isError}
        error={messagesQuery.error}
        onRetry={() => messagesQuery.refetch()}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              isMine={item.author.id === user?.id}
              onReply={() => setReplyTo(item)}
              onReact={(emoji) => reactMutation.mutate({ messageId: item.id, emoji })}
            />
          )}
        />
      </QueryState>

      {replyTo ? (
        <View
          style={[styles.replyBar, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.replyLabel, { color: colors.muted }]} numberOfLines={1}>
            Replying to {replyTo.author.firstName}: {replyTo.body}
          </Text>
          <Pressable onPress={() => setReplyTo(null)}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {showReactions ? (
        <View
          style={[
            styles.reactionTray,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <ReactionBar onReact={(emoji) => setDraft((d) => `${d}${emoji}`)} />
        </View>
      ) : null}

      <ScrollQuickReplies
        onSelect={(text) => sendMutation.mutate({ body: text, replyToId: replyTo?.id })}
      />

      <View style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable onPress={() => setShowReactions((v) => !v)} style={styles.emojiBtn}>
          <Text style={styles.emojiBtnText}>😊</Text>
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={handleTyping}
          placeholder="Message the group..."
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.foreground }]}
          multiline
        />
        <Pressable
          disabled={!draft.trim() || sendMutation.isPending}
          onPress={() => sendMutation.mutate({ body: draft.trim(), replyToId: replyTo?.id })}
          style={[
            styles.sendBtn,
            { backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.5 },
          ]}
        >
          <Text style={[styles.sendText, { color: colors.primaryForeground }]}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function ScrollQuickReplies({ onSelect }: { onSelect: (text: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.quickReplies}>
      {COMMUNITY_QUICK_REPLIES.map((reply) => (
        <Pressable
          key={reply}
          onPress={() => onSelect(reply)}
          style={[styles.quickReply, { backgroundColor: colors.mutedBg }]}
        >
          <Text style={[styles.quickReplyText, { color: colors.foreground }]}>{reply}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { gap: Spacing.sm, padding: Spacing.lg, paddingBottom: Spacing.md },
  replyBar: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  replyLabel: { flex: 1, fontSize: FontSize.xs, fontWeight: '600' },
  reactionTray: { borderTopWidth: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  quickReply: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  quickReplyText: { fontSize: FontSize.xs, fontWeight: '700' },
  composer: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  emojiBtn: { padding: Spacing.xs },
  emojiBtnText: { fontSize: 22 },
  input: { flex: 1, fontSize: FontSize.md, maxHeight: 100, paddingVertical: Spacing.sm },
  sendBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sendText: { fontWeight: '800' },
});
