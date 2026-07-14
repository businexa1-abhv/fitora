import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { parseDeepLink } from '@/lib/push';
import { isLocationDone, isNotificationsDone } from '@/lib/onboarding';

const ONBOARDING_ROUTES = new Set([
  'profile',
  'sports',
  'notifications',
  'location',
  'welcome',
  'mobile',
  'otp',
]);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const root = segments[0] as string | undefined;
    const leaf = segments[1] as string | undefined;
    const inAuth = root === '(auth)';
    const onSplash = !root || root === 'index';

    async function route() {
      if (onSplash) return;

      if (!isAuthenticated) {
        if (!inAuth) {
          const locationDone = await isLocationDone();
          router.replace(locationDone ? '/(auth)/welcome' : '/(auth)/location');
        }
        return;
      }

      const needsOnboarding = user?.onboardingComplete === false;
      if (needsOnboarding) {
        const onOnboarding =
          inAuth && typeof leaf === 'string' && ONBOARDING_ROUTES.has(leaf);
        if (!onOnboarding) {
          router.replace('/(auth)/profile');
        }
        return;
      }

      if (inAuth) {
        const notificationsDone = await isNotificationsDone();
        if (!notificationsDone && leaf !== 'notifications') {
          // Allow completed users who skipped notifications storage — go home
        }
        router.replace('/(tabs)');
      }
    }

    void route();
  }, [isAuthenticated, isLoading, segments, router, user?.onboardingComplete]);

  useEffect(() => {
    function handleUrl(event: { url: string }) {
      const link = parseDeepLink(event.url) ?? parseUniversalLink(event.url);
      if (!link) return;
      router.push(link.path as never);
    }

    const linkSub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const notificationSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { path?: string; url?: string };
      if (data.path) {
        router.push(data.path as never);
        return;
      }
      if (data.url) {
        handleUrl({ url: data.url });
      }
    });

    return () => {
      linkSub.remove();
      notificationSub.remove();
    };
  }, [router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function parseUniversalLink(url: string) {
  const prefix = Linking.createURL('/');
  if (!url.startsWith(prefix)) return null;
  const path = url.replace(prefix, '').replace(/^\//, '');
  return path ? { path, params: {} } : null;
}

function RootNavigator() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider>
            <AuthGate>
              <RootNavigator />
            </AuthGate>
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
