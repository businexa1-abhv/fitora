import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';

export default function MoreScreen() {
  const { colors } = useTheme();
  const { user, signOut, isOwner, isTrainer } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>More</Text>
      <Card style={{ marginTop: Spacing.lg }}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{user?.email}</Text>
        <Text style={{ color: colors.primary, marginTop: Spacing.sm, fontWeight: '700' }}>
          {isOwner ? 'Venue Owner' : isTrainer ? 'Coach' : 'User'}
        </Text>
      </Card>

      <Pressable
        onPress={() => void signOut()}
        style={[styles.signOut, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  name: { fontSize: FontSize.xl, fontWeight: '800' },
  signOut: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  signOutText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
});
