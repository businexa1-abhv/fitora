import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
import { CommunityAnnouncementType } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { QueryState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { AnnouncementCard } from '@/components/community/announcement-card';
import { EmptyCommunity } from '@/components/community/empty-community';
import { createAnnouncement, getAnnouncements } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function GroupAnnouncementsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors } = useTheme();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const announcementsQuery = useQuery({
    queryKey: ['community', 'announcements', groupId],
    queryFn: () => getAnnouncements(token!, groupId!),
    enabled: !!token && !!groupId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAnnouncement(token!, groupId!, {
        type: CommunityAnnouncementType.CUSTOM,
        title: title.trim(),
        body: body.trim(),
        pinned: false,
      }),
    onSuccess: () => {
      setTitle('');
      setBody('');
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ['community', 'announcements', groupId] });
    },
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Announcements"
        showBack
        rightAction={
          <Pressable onPress={() => setShowForm((v) => !v)}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>
              {showForm ? 'Close' : 'New'}
            </Text>
          </Pressable>
        }
      />

      {showForm ? (
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Announcement details..."
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.textArea, { color: colors.foreground, borderColor: colors.border }]}
          />
          <Button
            label={createMutation.isPending ? 'Posting...' : 'Post Announcement'}
            fullWidth
            disabled={!title.trim() || !body.trim() || createMutation.isPending}
            onPress={() => createMutation.mutate()}
          />
        </View>
      ) : null}

      <QueryState
        isLoading={announcementsQuery.isLoading}
        isError={announcementsQuery.isError}
        error={announcementsQuery.error}
        onRetry={() => announcementsQuery.refetch()}
      >
        <FlatList
          data={announcementsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyCommunity
              title="No announcements"
              message="Share updates with your group — court changes, cancellations, and more."
              actionLabel="Create Announcement"
              onAction={() => setShowForm(true)}
            />
          }
          renderItem={({ item }) => <AnnouncementCard announcement={item} />}
        />
      </QueryState>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: {
    borderBottomWidth: 1,
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    padding: Spacing.lg,
  },
  input: { borderRadius: Radius.lg, borderWidth: 1, fontSize: FontSize.md, padding: Spacing.md },
  textArea: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    fontSize: FontSize.md,
    minHeight: 96,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  list: { gap: Spacing.md, padding: Spacing.xl, paddingBottom: Spacing.xxxl },
});
