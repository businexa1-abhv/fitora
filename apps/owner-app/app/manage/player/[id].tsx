import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card, QueryState } from '@/components/ui';
import { ManageHeader } from '@/components/manage-header';
import { createCrmPlayerNote, getCrmPlayer, updateCrmPlayerProfile } from '@/lib/owner-api';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function PlayerProfileDetailScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const userId = params.id ?? '';
  const queryClient = useQueryClient();

  const [note, setNote] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [skillNotes, setSkillNotes] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  const query = useQuery({
    queryKey: ['owner', 'crm', 'player', userId],
    queryFn: async () => {
      const data = await getCrmPlayer(token!, userId);
      if (!profileLoaded) {
        setMedicalNotes(data.profile?.medicalNotes ?? '');
        setSkillLevel(data.profile?.skillLevel ?? '');
        setSkillNotes(data.profile?.skillNotes ?? '');
        setProfileLoaded(true);
      }
      return data;
    },
    enabled: !!token && !!userId,
  });

  const saveProfile = useMutation({
    mutationFn: () =>
      updateCrmPlayerProfile(token!, userId, {
        medicalNotes: medicalNotes.trim() || undefined,
        skillLevel: skillLevel.trim() || undefined,
        skillNotes: skillNotes.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['owner', 'crm', 'player', userId] });
      Alert.alert('Saved', 'Player profile updated.');
    },
  });

  const addNote = useMutation({
    mutationFn: () => createCrmPlayerNote(token!, userId, { content: note.trim() }),
    onSuccess: () => {
      setNote('');
      void queryClient.invalidateQueries({ queryKey: ['owner', 'crm', 'player', userId] });
    },
  });

  const data = query.data;
  const name = data
    ? `${data.user.firstName} ${data.user.lastName}`.trim() || data.user.email
    : 'Player';

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
      <ManageHeader title="Player Profile" />

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
      >
        {data ? (
          <>
            <Card style={styles.hero}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
                <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
              <Text style={{ color: colors.muted }}>{data.user.email}</Text>
              <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                <Text style={{ color: colors.secondary, fontWeight: '800', fontSize: 11 }}>
                  ACTIVE
                </Text>
              </View>
            </Card>

            <View style={styles.stats}>
              <Stat label="Bookings" value={String(data.bookingCount)} colors={colors} />
              <Stat label="Courts" value={String(data.courtNames?.length || 0)} colors={colors} />
              <Stat label="Attendance" value={String(data.attendanceCount ?? 0)} colors={colors} />
            </View>

            <Text style={[styles.section, { color: colors.foreground }]}>Membership</Text>
            <Card style={{ gap: Spacing.sm }}>
              {(data.memberships ?? []).length === 0 ? (
                <Text style={{ color: colors.muted }}>No active memberships</Text>
              ) : (
                data.memberships.map((m) => (
                  <Text key={m.id} style={{ color: colors.foreground, fontWeight: '700' }}>
                    {m.plan?.name ?? 'Plan'} · {m.isActive ? 'Active' : 'Inactive'}
                    {m.endDate ? ` · ends ${m.endDate.slice(0, 10)}` : ''}
                  </Text>
                ))
              )}
            </Card>

            <Text style={[styles.section, { color: colors.foreground }]}>Medical & Skill</Text>
            <Card style={{ gap: Spacing.sm }}>
              <TextInput
                value={medicalNotes}
                onChangeText={setMedicalNotes}
                placeholder="Medical notes"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              <TextInput
                value={skillLevel}
                onChangeText={setSkillLevel}
                placeholder="Skill level (Beginner / Intermediate / Advanced)"
                placeholderTextColor={colors.muted}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              <TextInput
                value={skillNotes}
                onChangeText={setSkillNotes}
                placeholder="Skill notes"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              <Pressable
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={() => saveProfile.mutate()}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  {saveProfile.isPending ? 'Saving…' : 'Save profile'}
                </Text>
              </Pressable>
            </Card>

            <Text style={[styles.section, { color: colors.foreground }]}>Staff Notes</Text>
            <Card style={{ gap: Spacing.sm }}>
              {(data.notes ?? []).map((n) => (
                <View key={n.id} style={{ gap: 2 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '700' }}>
                    {n.title || 'Note'}
                  </Text>
                  <Text style={{ color: colors.muted }}>{n.content}</Text>
                </View>
              ))}
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a staff note…"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              <Pressable
                style={[styles.btn, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  if (!note.trim()) return;
                  addNote.mutate();
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Add note</Text>
              </Pressable>
            </Card>

            <Text style={[styles.section, { color: colors.foreground }]}>Recent bookings</Text>
            <Card style={{ gap: Spacing.md }}>
              {(data.bookings ?? []).slice(0, 8).map((b) => (
                <Row
                  key={b.id}
                  icon="calendar-outline"
                  label={b.court?.name ?? 'Court'}
                  value={`${b.status} · ${
                    b.slot?.startTime ? new Date(b.slot.startTime).toLocaleString('en-IN') : '—'
                  }`}
                  colors={colors}
                />
              ))}
            </Card>

            <Text style={[styles.section, { color: colors.foreground }]}>Invoices</Text>
            <Card style={{ gap: Spacing.md }}>
              {(data.invoices ?? []).length === 0 ? (
                <Text style={{ color: colors.muted }}>No invoices</Text>
              ) : (
                data.invoices
                  .slice(0, 8)
                  .map((inv) => (
                    <Row
                      key={inv.id}
                      icon="receipt-outline"
                      label={inv.invoiceNumber}
                      value={formatCurrency(Number(inv.total))}
                      colors={colors}
                    />
                  ))
              )}
            </Card>
          </>
        ) : null}
      </QueryState>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { card: string; border: string; muted: string; foreground: string };
}) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: { muted: string; foreground: string; primary: string };
}) {
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: Spacing.md }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: FontSize.xs }}>{label}</Text>
        <Text style={{ color: colors.foreground, fontWeight: '700' }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, padding: Spacing.xl },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarText: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  name: { fontSize: FontSize.xl, fontWeight: '800' },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  stats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  stat: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: Spacing.md,
  },
  section: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
  },
});
