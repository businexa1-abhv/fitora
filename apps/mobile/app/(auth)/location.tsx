import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { AuthHero } from '@/components/auth/auth-hero';
import { AuthButton } from '@/components/auth/auth-button';
import { markLocationDone } from '@/lib/onboarding';
import { useTheme } from '@/providers/theme-provider';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function LocationPermissionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function allowLocation() {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        await markLocationDone();
        router.replace('/(auth)/welcome');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const place = places[0];
      const city = place?.city || place?.subregion || place?.region || undefined;
      const locationLabel = [place?.name, city, place?.region].filter(Boolean).join(', ');

      await markLocationDone({ city, locationLabel });
      router.replace('/(auth)/welcome');
    } catch {
      setError('Could not read location. You can continue and set city later.');
      await markLocationDone();
      router.replace('/(auth)/welcome');
    } finally {
      setLoading(false);
    }
  }

  async function skip() {
    await markLocationDone();
    router.replace('/(auth)/welcome');
  }

  return (
    <AuthHero
      title="Find courts near you"
      subtitle="FitOra uses your location to surface nearby venues, games, and trainers."
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="location" size={36} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Location helps you</Text>
        <Text style={[styles.cardBody, { color: colors.muted }]}>
          Discover courts, join nearby matches, and get relevant training recommendations.
        </Text>
      </View>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <AuthButton label="Allow location" fullWidth loading={loading} onPress={allowLocation} />
      <AuthButton
        label="Skip for now"
        variant="ghost"
        fullWidth
        style={{ marginTop: Spacing.sm }}
        onPress={skip}
      />
    </AuthHero>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  cardBody: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  error: { marginBottom: Spacing.md, fontWeight: '600' },
});
