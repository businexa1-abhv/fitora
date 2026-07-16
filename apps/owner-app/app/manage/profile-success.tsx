import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/theme-provider';
import { Card } from '@/components/ui';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function OwnerProfileEditSuccessScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    email?: string;
    phone?: string;
  }>();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
      }}
    >
      <View style={[styles.check, { backgroundColor: '#d1fae5' }]}>
        <Ionicons name="checkmark" size={36} color={colors.secondary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Profile Updated</Text>
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 4 }}>
        Your owner profile changes were saved successfully.
      </Text>

      <Card style={{ width: '100%', gap: Spacing.md, marginTop: Spacing.xl }}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.xl }}>
              {(params.name ?? 'O').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: FontSize.lg }}>
              {params.name ?? 'Owner'}
            </Text>
            <Text style={{ color: colors.muted }}>{params.email ?? '—'}</Text>
          </View>
        </View>
        {params.phone ? (
          <Text style={{ color: colors.foreground }}>Phone · {params.phone}</Text>
        ) : null}
      </Card>

      <Pressable
        style={[styles.btn, { backgroundColor: colors.primary, width: '100%' }]}
        onPress={() => router.replace('/manage/profile')}
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>Back to profile</Text>
      </Pressable>
      <Pressable
        style={[styles.linkRow, { borderColor: colors.border, width: '100%' }]}
        onPress={() => router.push('/manage/security')}
      >
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontWeight: '800', flex: 1 }}>
          Security & Access
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  check: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  avatarRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  btn: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  linkRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
});
