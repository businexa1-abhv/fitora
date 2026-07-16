import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Spacing } from '@/constants/theme';

export function ManageHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.btn}>
        <Ionicons name="arrow-back" size={22} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  btn: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  title: { flex: 1, fontSize: FontSize.md, fontWeight: '800', textAlign: 'center' },
});
