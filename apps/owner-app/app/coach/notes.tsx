import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { QueryState } from '@/components/ui';
import { createTrainingNote, listTrainingNotes } from '@/lib/trainer-api';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

type Filter = 'Student' | 'Batch' | 'Date' | 'More';

export default function TrainingNotesScreen() {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Student');
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftTitle, setDraftTitle] = useState('Session observation');

  const notesQuery = useQuery({
    queryKey: ['trainer', 'notes'],
    queryFn: () => listTrainingNotes(token!),
    enabled: !!token,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (notesQuery.data ?? []).filter((n) => {
      if (!q) return true;
      const hay =
        `${n.title ?? ''} ${n.content} ${n.enrollment?.kid?.firstName ?? ''} ${n.enrollment?.kid?.lastName ?? ''} ${n.batch?.name ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notesQuery.data, query]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!token || !draft.trim()) throw new Error('Write a note first');
      return createTrainingNote(token, {
        title: draftTitle.trim() || 'Training note',
        content: draft.trim(),
        isPrivate: filter !== 'Student',
      });
    },
    onSuccess: async () => {
      setComposing(false);
      setDraft('');
      await queryClient.invalidateQueries({ queryKey: ['trainer', 'notes'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="menu" size={22} color={CoachColors.brand} />
        </Pressable>
        <Text style={styles.title}>Training Notes</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.firstName?.[0] ?? 'C').toUpperCase()}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg }}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={CoachColors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            placeholderTextColor={CoachColors.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {(['Student', 'Batch', 'Date', 'More'] as Filter[]).map((chip) => {
            const active = filter === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => setFilter(chip)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons
                  name={
                    chip === 'Student'
                      ? 'person'
                      : chip === 'Batch'
                        ? 'people'
                        : chip === 'Date'
                          ? 'calendar'
                          : 'options'
                  }
                  size={12}
                  color={active ? '#fff' : CoachColors.brand}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 110,
          gap: Spacing.sm,
          marginTop: Spacing.md,
        }}
      >
        <QueryState
          isLoading={notesQuery.isLoading}
          isError={notesQuery.isError}
          error={notesQuery.error as Error}
          onRetry={() => notesQuery.refetch()}
        >
          {composing ? (
            <View style={styles.composeCard}>
              <TextInput
                style={styles.composeTitle}
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Title"
                placeholderTextColor={CoachColors.muted}
              />
              <TextInput
                style={styles.composeBody}
                multiline
                value={draft}
                onChangeText={setDraft}
                placeholder="Write training note…"
                placeholderTextColor={CoachColors.muted}
              />
              <View style={styles.composeActions}>
                <Pressable onPress={() => setComposing(false)}>
                  <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.saveBtn}
                  onPress={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  <Text style={styles.saveText}>
                    {createMutation.isPending ? 'Saving…' : 'Save Note'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {filtered.length === 0 && !composing ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={32} color={CoachColors.muted} />
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptyBody}>Capture session observations for students.</Text>
            </View>
          ) : (
            filtered.map((note) => {
              const student = note.enrollment?.kid
                ? `${note.enrollment.kid.firstName} ${note.enrollment.kid.lastName}`.trim()
                : (note.batch?.name ?? 'General');
              const privateNote = note.isPrivate;
              return (
                <View key={note.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.student}>{student}</Text>
                    <View
                      style={[
                        styles.privacy,
                        {
                          backgroundColor: privateNote ? CoachColors.softOrange : '#e8eef5',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: privateNote ? CoachColors.primaryContainer : '#3d5a80',
                          fontSize: 10,
                          fontWeight: '800',
                        }}
                      >
                        {privateNote ? 'Private' : 'Shared with Parent'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.stamp}>
                    {new Date(note.createdAt).toLocaleString()}
                    {note.title ? ` · ${note.title}` : ''}
                  </Text>
                  <Text style={styles.body} numberOfLines={3}>
                    {note.content}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable style={styles.action}>
                      <Ionicons name="share-outline" size={14} color={CoachColors.brand} />
                      <Text style={styles.actionText}>Share</Text>
                    </Pressable>
                    <Pressable style={styles.action}>
                      <Ionicons name="pencil" size={14} color={CoachColors.brand} />
                      <Text style={styles.actionText}>Edit</Text>
                    </Pressable>
                    <Pressable>
                      <Ionicons name="trash-outline" size={16} color={CoachColors.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </QueryState>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setComposing(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: CoachColors.background, flex: 1 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  title: { color: CoachColors.brand, fontSize: FontSize.xl, fontWeight: '800' },
  avatar: {
    alignItems: 'center',
    backgroundColor: CoachColors.primaryContainer,
    borderRadius: Radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  search: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    color: CoachColors.foreground,
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
  },
  chips: { marginTop: Spacing.md },
  chip: {
    alignItems: 'center',
    backgroundColor: CoachColors.softOrange,
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 4,
    marginRight: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: CoachColors.primary },
  chipText: { color: CoachColors.brand, fontSize: FontSize.sm, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  card: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  student: { color: CoachColors.foreground, fontSize: FontSize.md, fontWeight: '800' },
  privacy: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  stamp: { color: CoachColors.muted, fontSize: FontSize.xs, marginTop: 4 },
  body: { color: CoachColors.foreground, fontSize: FontSize.sm, marginTop: Spacing.sm },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
  },
  action: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  actionText: { color: CoachColors.brand, fontSize: FontSize.xs, fontWeight: '700' },
  composeCard: {
    backgroundColor: CoachColors.card,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  composeTitle: {
    borderBottomColor: CoachColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    color: CoachColors.foreground,
    fontWeight: '800',
    paddingBottom: Spacing.sm,
  },
  composeBody: {
    color: CoachColors.foreground,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  composeActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancel: { color: CoachColors.muted, fontWeight: '700' },
  saveBtn: {
    backgroundColor: CoachColors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  saveText: { color: '#fff', fontWeight: '800' },
  empty: { alignItems: 'center', marginTop: Spacing.xxxl, padding: Spacing.xl },
  emptyTitle: {
    color: CoachColors.foreground,
    fontSize: FontSize.md,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  emptyBody: { color: CoachColors.muted, fontSize: FontSize.sm, marginTop: 4, textAlign: 'center' },
  fab: {
    alignItems: 'center',
    backgroundColor: CoachColors.primary,
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
  },
});
