import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHero } from '@/components/auth/auth-hero';
import { AuthButton } from '@/components/auth/auth-button';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const welcomeHero = require('../../assets/stitch-auth/welcome-hero.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <AuthHero
      title="Find your game. Book your court."
      subtitle="Discover venues, join games, train smarter, and keep every FitOra moment in one premium player app."
      artworkSource={welcomeHero}
      artworkLabel="Players enjoying multiple sports"
    >
      <View style={styles.features}>
        {[
          { icon: 'tennisball' as const, label: 'Nearby courts & academies' },
          { icon: 'people' as const, label: 'Pick-up games with friends' },
          { icon: 'sparkles' as const, label: 'Training, events & rewards' },
        ].map((item) => (
          <View
            key={item.label}
            style={[styles.feature, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name={item.icon} size={20} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.foreground }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <AuthButton
        label="Continue with Mobile"
        fullWidth
        onPress={() => router.push('/(auth)/mobile')}
      />

      <View style={styles.social}>
        <AuthButton
          label="Continue with Google"
          variant="outline"
          fullWidth
          onPress={() => router.push('/(auth)/mobile')}
        />
        {Platform.OS === 'ios' && (
          <AuthButton
            label="Continue with Apple"
            variant="secondary"
            fullWidth
            style={{ marginTop: Spacing.sm }}
            onPress={() => router.push('/(auth)/mobile')}
          />
        )}
      </View>

      <Text style={[styles.legal, { color: colors.muted }]}>
        By continuing you agree to FitOra Terms of Service and Privacy Policy.
      </Text>
    </AuthHero>
  );
}

const styles = StyleSheet.create({
  features: { gap: Spacing.sm, marginBottom: Spacing.xl },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  featureText: { fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  social: { marginTop: Spacing.md, gap: Spacing.sm },
  legal: {
    marginTop: Spacing.lg,
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
