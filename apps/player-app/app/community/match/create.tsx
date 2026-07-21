import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COMMUNITY_SKILL_LABELS, CommunityMatchType, CommunitySkillLevel } from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { createMatch, createMatchFromBooking } from '@/lib/community';
import { FontSize, Radius, Spacing, type ThemeColors } from '@/constants/theme';

function fieldInputStyle(colors: ThemeColors) {
  return { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card };
}

const MATCH_TYPES = Object.values(CommunityMatchType);
const SKILL_LEVELS = Object.values(CommunitySkillLevel);

export default function CreateMatchScreen() {
  const params = useLocalSearchParams<{
    bookingId?: string;
    courtName?: string;
    startTime?: string;
    endTime?: string;
    groupId?: string;
  }>();
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState(params.courtName ? `${params.courtName} Match` : '');
  const [venueLabel, setVenueLabel] = useState(params.courtName ?? '');
  const [startsAt, setStartsAt] = useState(params.startTime ?? new Date().toISOString());
  const [endsAt, setEndsAt] = useState(params.endTime ?? '');
  const [requiredPlayers, setRequiredPlayers] = useState('4');
  const [skillLevel, setSkillLevel] = useState<CommunitySkillLevel>(
    CommunitySkillLevel.INTERMEDIATE,
  );
  const [entryFee, setEntryFee] = useState('0');
  const [shuttleIncluded, setShuttleIncluded] = useState(false);
  const [ballIncluded, setBallIncluded] = useState(false);
  const [matchType, setMatchType] = useState<CommunityMatchType>(CommunityMatchType.OPEN_MATCH);
  const [groupId, setGroupId] = useState(params.groupId ?? '');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (params.bookingId) {
        return createMatchFromBooking(token!, {
          bookingId: params.bookingId,
          groupId: groupId.trim() || undefined,
          title: title.trim(),
          venueLabel: venueLabel.trim() || undefined,
          startsAt,
          endsAt: endsAt || undefined,
          requiredPlayers: Number(requiredPlayers) || 4,
          skillLevel,
          entryFee: Number(entryFee) || 0,
          shuttleIncluded,
          ballIncluded,
          matchType,
        });
      }
      if (!groupId.trim()) throw new Error('Group ID is required');
      return createMatch(token!, {
        groupId: groupId.trim(),
        title: title.trim(),
        venueLabel: venueLabel.trim() || undefined,
        startsAt,
        endsAt: endsAt || undefined,
        requiredPlayers: Number(requiredPlayers) || 4,
        skillLevel,
        entryFee: Number(entryFee) || 0,
        shuttleIncluded,
        ballIncluded,
        matchType,
        bookingId: params.bookingId,
      });
    },
    onSuccess: (match) => router.replace(`/community/match/${match.id}`),
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Create Match"
        showBack
        subtitle={params.bookingId ? 'From booking' : undefined}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Title">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Friday Night Doubles"
            placeholderTextColor={colors.muted}
            style={[styles.input, fieldInputStyle(colors)]}
          />
        </Field>
        {!params.bookingId ? (
          <Field label="Group ID">
            <TextInput
              value={groupId}
              onChangeText={setGroupId}
              placeholder="Group UUID"
              autoCapitalize="none"
              placeholderTextColor={colors.muted}
              style={[styles.input, fieldInputStyle(colors)]}
            />
          </Field>
        ) : null}
        <Field label="Venue">
          <TextInput
            value={venueLabel}
            onChangeText={setVenueLabel}
            placeholderTextColor={colors.muted}
            style={[styles.input, fieldInputStyle(colors)]}
          />
        </Field>
        <Field label="Starts at (ISO)">
          <TextInput
            value={startsAt}
            onChangeText={setStartsAt}
            autoCapitalize="none"
            placeholderTextColor={colors.muted}
            style={[styles.input, fieldInputStyle(colors)]}
          />
        </Field>
        <Field label="Ends at (ISO)">
          <TextInput
            value={endsAt}
            onChangeText={setEndsAt}
            autoCapitalize="none"
            placeholderTextColor={colors.muted}
            style={[styles.input, fieldInputStyle(colors)]}
          />
        </Field>
        <Field label="Required players">
          <TextInput
            value={requiredPlayers}
            onChangeText={setRequiredPlayers}
            keyboardType="number-pad"
            placeholderTextColor={colors.muted}
            style={[styles.input, fieldInputStyle(colors)]}
          />
        </Field>
        <Field label="Skill level">
          <ChipRow>
            {SKILL_LEVELS.map((level) => (
              <Chip
                key={level}
                label={COMMUNITY_SKILL_LABELS[level]}
                selected={skillLevel === level}
                onPress={() => setSkillLevel(level)}
              />
            ))}
          </ChipRow>
        </Field>
        <Field label="Entry fee (INR)">
          <TextInput
            value={entryFee}
            onChangeText={setEntryFee}
            keyboardType="number-pad"
            placeholderTextColor={colors.muted}
            style={[styles.input, fieldInputStyle(colors)]}
          />
        </Field>
        <Field label="Match type">
          <ChipRow>
            {MATCH_TYPES.map((type) => (
              <Chip
                key={type}
                label={type.replace(/_/g, ' ')}
                selected={matchType === type}
                onPress={() => setMatchType(type)}
              />
            ))}
          </ChipRow>
        </Field>
        <View style={styles.toggleRow}>
          <Toggle
            label="Shuttle included"
            active={shuttleIncluded}
            onPress={() => setShuttleIncluded((v) => !v)}
          />
          <Toggle
            label="Ball included"
            active={ballIncluded}
            onPress={() => setBallIncluded((v) => !v)}
          />
        </View>
        <Button
          label={createMutation.isPending ? 'Creating...' : 'Create Match'}
          fullWidth
          disabled={!title.trim() || createMutation.isPending}
          onPress={() => createMutation.mutate()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? colors.primaryForeground : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Toggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggle,
        { backgroundColor: active ? colors.primaryLight : colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.toggleText, { color: active ? colors.primary : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.lg, padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  field: { gap: Spacing.sm },
  label: { fontSize: FontSize.sm, fontWeight: '800' },
  input: { borderRadius: Radius.lg, borderWidth: 1, fontSize: FontSize.md, padding: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: { fontSize: FontSize.xs, fontWeight: '800' },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  toggle: { borderRadius: Radius.lg, borderWidth: 1, flex: 1, padding: Spacing.md },
  toggleText: { fontSize: FontSize.xs, fontWeight: '800', textAlign: 'center' },
});
