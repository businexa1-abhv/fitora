import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const PARTNER_URL = process.env.EXPO_PUBLIC_PARTNER_WEB_URL ?? 'http://localhost:3011';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0a0a3a', '#15157d', '#1a1a55']} style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={[styles.logoMark, { backgroundColor: colors.primaryContainer }]}>
            <MaterialCommunityIcons name="dumbbell" size={22} color="#fff" />
          </View>
        </View>

        <Text style={styles.title}>FitOra Owner</Text>
        <Text style={styles.tagline}>
          The authoritative platform for elite performance coaches and athletic empire management.
        </Text>

        <View style={styles.cards}>
          <View style={styles.actionCard}>
            <View style={styles.iconBox}>
              <Ionicons name="log-in-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.primary }]}>Sign In</Text>
            <Text style={styles.cardBody}>
              Access your facility dashboard and manage your training roster.
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryBtnText}>Login to Dashboard</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.actionCard}>
            <View style={styles.iconBox}>
              <Ionicons name="grid-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.primary }]}>New Owner</Text>
            <Text style={styles.cardBody}>
              Scale your fitness business with world-class management tools.
            </Text>
            <Pressable
              onPress={() => Linking.openURL(`${PARTNER_URL}/register/business`)}
              style={[styles.outlineBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.outlineBtnText, { color: colors.primary }]}>
                Register Facility
              </Text>
              <MaterialCommunityIcons
                name="office-building-plus"
                size={18}
                color={colors.primary}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.empire}>EMPIRE STANDARD</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>450+</Text>
              <Text style={styles.statLabel}>Coaches</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>12.8k</Text>
              <Text style={styles.statLabel}>Athletes</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Global Hubs</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.lg },
  brandRow: { alignItems: 'center', marginBottom: Spacing.lg },
  logoMark: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: '#fff',
    fontSize: FontSize.hero,
    fontWeight: '800',
    textAlign: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSize.md,
    lineHeight: 22,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  cards: { gap: Spacing.md, marginTop: Spacing.xxxl },
  actionCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: '#f0f3ff',
    borderRadius: Radius.md,
    height: 36,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    width: 36,
  },
  cardTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  cardBody: { color: '#464652', fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.lg },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  primaryBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  outlineBtn: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  outlineBtnText: { fontSize: FontSize.md, fontWeight: '800' },
  footer: { marginTop: 'auto', paddingTop: Spacing.xxxl },
  empire: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.xs, marginTop: 2 },
});
