import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@fitora/auth';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function OwnerNavigator() {
  const { hasRole, isAuthenticated, isLoading, session } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading]);

  if (isLoading) return null;

  const isOwner = hasRole('OWNER');
  const isCoach = hasRole('COACH');

  return (
    <>
      <StatusBar style="dark" />
      {!isAuthenticated ? (
        <Stack initialRouteName="(auth)" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
        </Stack>
      ) : isOwner ? (
        <Stack
          initialRouteName={session?.subscriptionActive === false ? 'subscription' : '(owner)'}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="(owner)" />
          <Stack.Screen name="subscription" />
        </Stack>
      ) : isCoach ? (
        <Stack initialRouteName="(coach)" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(coach)" />
        </Stack>
      ) : (
        <Stack initialRouteName="(auth)" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
        </Stack>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OwnerNavigator />
    </AuthProvider>
  );
}
