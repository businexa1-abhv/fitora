import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function OwnerNavigator() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading, isOwner, isTrainer } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    const firstSegment = segments[0];
    if (typeof firstSegment !== 'string') return;
    const inAuth = firstSegment === '(auth)';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (isAuthenticated && inAuth) {
      if (isOwner || isTrainer) {
        router.replace('/(tabs)');
      }
    }

    const isCoachOnly = isTrainer && !isOwner;
    if (isAuthenticated && isCoachOnly && (firstSegment === 'ops' || firstSegment === 'manage')) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, isOwner, isTrainer, router, segments]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="court" />
        <Stack.Screen name="ops" />
        <Stack.Screen name="manage" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider>
            <OwnerNavigator />
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
