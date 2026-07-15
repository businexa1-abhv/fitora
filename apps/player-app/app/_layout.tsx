import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@fitora/auth';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function PlayerNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <>
      <StatusBar style="dark" />
      {!isAuthenticated ? (
        <Stack initialRouteName="(auth)" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
        </Stack>
      ) : (
        <Stack initialRouteName="(player)" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(player)" />
        </Stack>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PlayerNavigator />
    </AuthProvider>
  );
}
