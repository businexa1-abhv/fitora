import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { CoachColors } from '@/constants/coach-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export function CoachHeader({ onBellPress }: { onBellPress?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const initials =
    `${user?.firstName?.[0] ?? 'C'}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'C';

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: CoachColors.primaryContainer }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <Text style={styles.brand}>FitOra Coach</Text>
      <Pressable
        onPress={onBellPress ?? (() => router.push('/coach/notifications' as never))}
        hitSlop={8}
      >
        <Ionicons name="notifications-outline" size={22} color={CoachColors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
  brand: {
    color: CoachColors.brand,
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginLeft: Spacing.xs,
  },
});
