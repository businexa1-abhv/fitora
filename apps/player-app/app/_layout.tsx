import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { parseDeepLink } from '@/lib/push';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppNavigator() {
  const { isDark, colors } = useTheme();
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync().catch(() => undefined);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return undefined;

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
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return null;
  }

  const commonOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
    animation: 'slide_from_right' as const,
  };

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack initialRouteName="(auth)" screenOptions={commonOptions}>
          <Stack.Screen name="(auth)" />
        </Stack>
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack initialRouteName="(tabs)" screenOptions={commonOptions}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="booking/[courtId]" />
        <Stack.Screen name="booking/success" />
        <Stack.Screen name="court/[id]" />
        <Stack.Screen name="venue/[id]" />
        <Stack.Screen name="membership/index" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="print/[id]" />
        <Stack.Screen name="services/index" />
        <Stack.Screen name="services/[id]" />
        <Stack.Screen name="shop/[slug]" />
        <Stack.Screen name="shop/cart" />
        <Stack.Screen name="shop/checkout" />
        <Stack.Screen name="training/[programId]" />
        <Stack.Screen name="training/enroll/[batchId]" />
        <Stack.Screen name="wallet" />
      </Stack>
    </>
  );
}

function parseUniversalLink(url: string) {
  const prefix = Linking.createURL('/');
  if (!url.startsWith(prefix)) return null;
  const path = url.replace(prefix, '').replace(/^\//, '');
  return path ? { path, params: {} } : null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppNavigator />
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
