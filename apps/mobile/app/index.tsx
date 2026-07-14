import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { APP_NAME } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { isLocationDone } from '@/lib/onboarding';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const fitoraLogo = require('../assets/stitch-auth/fitora-logo.png');
const splashIllustration = require('../assets/stitch-auth/splash-illustration.png');

export default function SplashScreen() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  useEffect(() => {
    if (isLoading || routing) return;

    const timer = setTimeout(async () => {
      setRouting(true);
      if (isAuthenticated) {
        if (user && user.onboardingComplete === false) {
          router.replace('/(auth)/profile');
          return;
        }
        router.replace('/(tabs)');
        return;
      }

      const locationDone = await isLocationDone();
      router.replace(locationDone ? '/(auth)/welcome' : '/(auth)/location');
    }, 900);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user, router, routing]);

  return (
    <LinearGradient
      colors={[colors.heroFrom, colors.heroTo]}
      style={styles.root}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View style={[styles.content, { opacity }]}>
        <View style={styles.logoCard}>
          <Image source={fitoraLogo} style={styles.logo} resizeMode="contain" accessibilityLabel="FitOra logo" />
        </View>
        <Image
          source={splashIllustration}
          style={styles.illustration}
          resizeMode="contain"
          accessibilityLabel="Sports illustration"
        />
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.tagline}>One App for Everything Sports</Text>
        <ActivityIndicator color="#fff" style={{ marginTop: Spacing.xl }} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: Spacing.xl },
  logoCard: {
    width: 132,
    height: 132,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 132, height: 132 },
  illustration: { width: 240, height: 150, marginTop: Spacing.xl },
  brand: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagline: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: FontSize.lg,
    marginTop: Spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
});
