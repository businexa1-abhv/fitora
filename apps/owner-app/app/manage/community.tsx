import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import {
  broadcastCommunityAnnouncement,
  createOwnerCommunityGroup,
  getOwnerCommunityGroups,
} from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function OwnerCommunityScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [emoji, setEmoji] = useState('🏸');
  const [announceGroupId, setAnnounceGroupId] = useState<string | null>(null);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');

  const groupsQuery = useQuery({
    queryKey: ['owner', 'community', 'groups'],
    queryFn: () => getOwnerCommunityGroups(token!),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createOwnerCommunityGroup(token!, {
        name: name.trim(),
        groupType: 'PUBLIC',
        privacy: 'PUBLIC',
        city: city.trim() || undefined,
        emoji,
        description: 'Venue community managed by the court owner',
      }),
    onSuccess: async () => {
      setName('');
      setCity('');
      await queryClient.invalidateQueries({ queryKey: ['owner', 'community', 'groups'] });
      Alert.alert('Created', 'Community group is live for players nearby.');
    },
    onError: (e: Error) => Alert.alert('Create failed', e.message),
  });

  const announceMutation = useMutation({
    mutationFn: () =>
      broadcastCommunityAnnouncement(token!, announceGroupId!, {
        type: 'CUSTOM',
        title: announceTitle.trim(),
        body: announceBody.trim(),
      }),
    onSuccess: () => {
      setAnnounceTitle('');
      setAnnounceBody('');
      setAnnounceGroupId(null);
      Alert.alert('Sent', 'Announcement broadcast to group members.');
    },
    onError: (e: Error) => Alert.alert('Broadcast failed', e.message),
  });

  const groups = groupsQuery.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <ManageHeader title="Community Hub" />
      <Text style={[styles.title, { color: colors.foreground }]}>Community Hub</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Create venue communities, broadcast announcements, and schedule group events.
      </Text>

      <Card style={styles.card}>
        <Text style={[styles.section, { color: colors.foreground }]}>Create community</Text>
        <TextInput
          placeholder="Group name"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <TextInput
          placeholder="City"
          placeholderTextColor={colors.muted}
          value={city}
          onChangeText={setCity}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <View style={styles.emojiRow}>
          {['🏸', '🏏', '⚽', '🎾', '🔥', '🏆'].map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              style={[
                styles.emojiChip,
                {
                  backgroundColor: emoji === e ? colors.primary : colors.mutedBg,
                },
              ]}
            >
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => createMutation.mutate()}
          disabled={!name.trim() || createMutation.isPending}
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: !name.trim() ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {createMutation.isPending ? 'Creating…' : 'Create Group'}
          </Text>
        </Pressable>
      </Card>

      <Text style={[styles.section, { color: colors.foreground, marginTop: Spacing.xl }]}>
        Your communities
      </Text>
      <QueryState
        isLoading={groupsQuery.isLoading}
        isError={groupsQuery.isError}
        error={groupsQuery.error as Error | null}
        empty={groups.length === 0}
        onRetry={() => groupsQuery.refetch()}
      >
        {groups.map((g) => (
          <Card key={g.id} style={styles.groupCard}>
            <View style={styles.groupRow}>
              <Text style={styles.emojiLarge}>{g.emoji ?? '🏸'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.groupName, { color: colors.foreground }]}>{g.name}</Text>
                <Text style={{ color: colors.muted, fontSize: FontSize.sm }}>
                  {g.memberCount} members · {g.city ?? 'Local'}
                </Text>
              </View>
              <Pressable
                onPress={() => setAnnounceGroupId(g.id)}
                style={[styles.ghostBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.sm }}>
                  Announce
                </Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </QueryState>

      {announceGroupId ? (
        <Card style={[styles.card, { marginTop: Spacing.lg }]}>
          <Text style={[styles.section, { color: colors.foreground }]}>Broadcast announcement</Text>
          <TextInput
            placeholder="Title"
            placeholderTextColor={colors.muted}
            value={announceTitle}
            onChangeText={setAnnounceTitle}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TextInput
            placeholder="Message to members"
            placeholderTextColor={colors.muted}
            value={announceBody}
            onChangeText={setAnnounceBody}
            multiline
            style={[
              styles.input,
              styles.textArea,
              { borderColor: colors.border, color: colors.foreground },
            ]}
          />
          <View style={styles.rowActions}>
            <Pressable onPress={() => setAnnounceGroupId(null)}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => announceMutation.mutate()}
              disabled={!announceTitle.trim() || !announceBody.trim()}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, flex: 0, paddingHorizontal: 20 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Send</Text>
            </Pressable>
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.xxl, fontWeight: '900', marginTop: Spacing.md },
  subtitle: { fontSize: FontSize.sm, marginTop: Spacing.xs, marginBottom: Spacing.xl },
  card: { gap: Spacing.md, padding: Spacing.lg },
  section: { fontSize: FontSize.lg, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  emojiLarge: { fontSize: 28 },
  primaryBtn: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  groupCard: { marginTop: Spacing.md, padding: Spacing.md },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  groupName: { fontSize: FontSize.md, fontWeight: '800' },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
