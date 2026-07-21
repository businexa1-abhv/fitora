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
import { useRouter } from 'expo-router';
import {
  COMMUNITY_EMOJI_PRESETS,
  COMMUNITY_GROUP_TYPE_LABELS,
  COMMUNITY_SKILL_LABELS,
  CommunityGroupType,
  CommunityPlayingWindow,
  CommunityPrivacy,
  CommunitySkillLevel,
} from '@fitora/shared';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { createGroup } from '@/lib/community';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const GROUP_TYPES = Object.values(CommunityGroupType).slice(0, 8);
const SKILL_LEVELS = Object.values(CommunitySkillLevel);
const PRIVACY_OPTIONS = Object.values(CommunityPrivacy);
const PLAYING_WINDOWS = Object.values(CommunityPlayingWindow);
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CreateGroupScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [groupType, setGroupType] = useState<CommunityGroupType>(CommunityGroupType.BADMINTON);
  const [locationLabel, setLocationLabel] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [skillLevel, setSkillLevel] = useState<CommunitySkillLevel>(
    CommunitySkillLevel.INTERMEDIATE,
  );
  const [maxPlayers, setMaxPlayers] = useState('12');
  const [playingDays, setPlayingDays] = useState<string[]>(['Sat', 'Sun']);
  const [playingWindows, setPlayingWindows] = useState<CommunityPlayingWindow[]>([
    CommunityPlayingWindow.EVENING,
  ]);
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [emoji, setEmoji] = useState<string>(COMMUNITY_EMOJI_PRESETS[0]);
  const [privacy, setPrivacy] = useState<CommunityPrivacy>(CommunityPrivacy.PUBLIC);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      createGroup(token!, {
        name: name.trim(),
        groupType,
        locationLabel: locationLabel.trim() || undefined,
        city: city.trim() || undefined,
        skillLevel,
        maxPlayers: Number(maxPlayers) || 12,
        playingDays,
        playingWindows,
        description: description.trim() || undefined,
        rules: rules.trim() || undefined,
        emoji,
        privacy,
        coverPhotoUrl: coverPhotoUrl.trim() || undefined,
      }),
    onSuccess: (group) => router.replace(`/community/group/${group.id}`),
  });

  function toggleDay(day: string) {
    setPlayingDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  }

  function toggleWindow(window: CommunityPlayingWindow) {
    setPlayingWindows((current) =>
      current.includes(window) ? current.filter((w) => w !== window) : [...current, window],
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Create Group" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Group name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Hyderabad Smash Squad"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
        </Field>

        <Field label="Sport / type">
          <ChipRow>
            {GROUP_TYPES.map((type) => (
              <Chip
                key={type}
                label={COMMUNITY_GROUP_TYPE_LABELS[type]}
                selected={groupType === type}
                onPress={() => setGroupType(type)}
              />
            ))}
          </ChipRow>
        </Field>

        <Field label="Location">
          <TextInput
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Gachibowli Sports Arena"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
        </Field>

        <Field label="City">
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
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

        <Field label="Max players">
          <TextInput
            value={maxPlayers}
            onChangeText={setMaxPlayers}
            keyboardType="number-pad"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
        </Field>

        <Field label="Playing days">
          <ChipRow>
            {WEEKDAYS.map((day) => (
              <Chip
                key={day}
                label={day}
                selected={playingDays.includes(day)}
                onPress={() => toggleDay(day)}
              />
            ))}
          </ChipRow>
        </Field>

        <Field label="Playing windows">
          <ChipRow>
            {PLAYING_WINDOWS.map((window) => (
              <Chip
                key={window}
                label={window.replace(/_/g, ' ')}
                selected={playingWindows.includes(window)}
                onPress={() => toggleWindow(window)}
              />
            ))}
          </ChipRow>
        </Field>

        <Field label="Description">
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Tell players what this group is about..."
            placeholderTextColor={colors.muted}
            style={[
              styles.textArea,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
        </Field>

        <Field label="Rules">
          <TextInput
            value={rules}
            onChangeText={setRules}
            multiline
            placeholder="Be on time, split shuttle costs..."
            placeholderTextColor={colors.muted}
            style={[
              styles.textArea,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
        </Field>

        <Field label="Group emoji">
          <View style={styles.emojiRow}>
            {COMMUNITY_EMOJI_PRESETS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setEmoji(item)}
                style={[
                  styles.emojiBtn,
                  {
                    backgroundColor: emoji === item ? colors.primaryLight : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.emojiText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Privacy">
          <ChipRow>
            {PRIVACY_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={option.replace(/_/g, ' ')}
                selected={privacy === option}
                onPress={() => setPrivacy(option)}
              />
            ))}
          </ChipRow>
        </Field>

        <Field label="Cover photo URL">
          <TextInput
            value={coverPhotoUrl}
            onChangeText={setCoverPhotoUrl}
            placeholder="https://..."
            autoCapitalize="none"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
        </Field>

        <Button
          label={createMutation.isPending ? 'Creating...' : 'Create Group'}
          fullWidth
          disabled={!name.trim() || createMutation.isPending}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.lg, padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  field: { gap: Spacing.sm },
  label: { fontSize: FontSize.sm, fontWeight: '800' },
  input: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  textArea: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    fontSize: FontSize.md,
    minHeight: 96,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: { fontSize: FontSize.xs, fontWeight: '800' },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiBtn: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emojiText: { fontSize: 22 },
});
