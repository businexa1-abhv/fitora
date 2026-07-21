import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
import { isSafeDeepLinkPath, parseDeepLink } from '@/lib/push';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function parseOwnerDeepLink(url: string): { path: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'fitora-owner:') return null;
    const path = parsed.hostname + parsed.pathname;
    return { path: path.replace(/^\//, '') };
  } catch {
    return null;
  }
}

function OwnerNavigator() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading, isOwner, isTrainer, isCoachMode, isSubscriptionExpired } =
    useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  // ─── Deep linking + push notification routing ───────────────────────────────
  useEffect(() => {
    if (isLoading || !isAuthenticated) return undefined;

    function handleUrl(event: { url: string }) {
      const link = parseDeepLink(event.url) ?? parseOwnerDeepLink(event.url);
      if (!link || !isSafeDeepLinkPath(link.path)) return;
      router.push(link.path as never);
    }

    const linkSub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const notifSub = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const data = response.notification.request.content.data as {
          path?: string;
          url?: string;
        };
        if (data.path) {
          if (isSafeDeepLinkPath(data.path)) router.push(data.path as never);
          return;
        }
        if (data.url) handleUrl({ url: data.url });
      },
    );

    return () => {
      linkSub.remove();
      notifSub.remove();
    };
  }, [isAuthenticated, isLoading, router]);

  // ─── Auth + role routing ────────────────────────────────────────────────────
  useEffect(() => {
    const firstSegment = segments[0];
    if (typeof firstSegment !== 'string') return;
    const inAuth = firstSegment === '(auth)';
    const onExpiredScreen = firstSegment === 'subscription-expired';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (isAuthenticated && inAuth) {
      if (isOwner || isTrainer) {
        router.replace('/(tabs)');
      }
    }

    if (isAuthenticated && isOwner && isSubscriptionExpired && !onExpiredScreen) {
      router.replace('/subscription-expired');
      return;
    }

    if (isAuthenticated && isCoachMode && (firstSegment === 'ops' || firstSegment === 'manage')) {
      router.replace('/(tabs)');
    }
  }, [
    isAuthenticated,
    isLoading,
    isOwner,
    isTrainer,
    isCoachMode,
    isSubscriptionExpired,
    router,
    segments,
  ]);

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
        <Stack.Screen name="coach" />
        <Stack.Screen name="court" />
        <Stack.Screen name="ops" />
        <Stack.Screen name="manage" />
        <Stack.Screen name="bookings" />
        <Stack.Screen name="subscription-expired" />
        <Stack.Screen name="notification-permission" />
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
