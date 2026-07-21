import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type CommunityAnnouncement } from '@fitora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui/card';
import { FontSize, Spacing } from '@/constants/theme';

interface AnnouncementCardProps {
  announcement: CommunityAnnouncement;
  onPress?: () => void;
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function AnnouncementCard({ announcement, onPress }: AnnouncementCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="megaphone" size={18} color={colors.primary} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {announcement.title}
            </Text>
            <Text style={[styles.meta, { color: colors.muted }]}>
              {announcement.author.firstName} · {formatWhen(announcement.createdAt)}
            </Text>
          </View>
          {announcement.pinned ? <Ionicons name="pin" size={16} color={colors.accent} /> : null}
        </View>
        <Text style={[styles.body, { color: colors.muted }]} numberOfLines={3}>
          {announcement.body}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.88 },
  card: { gap: Spacing.sm },
  header: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  copy: { flex: 1 },
  title: { fontSize: FontSize.md, fontWeight: '900' },
  meta: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  body: { fontSize: FontSize.sm, lineHeight: 20 },
});
