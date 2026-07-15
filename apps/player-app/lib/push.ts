import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerDeviceToken } from './notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function isNotificationPermissionGranted(permission: Notifications.NotificationPermissionsStatus) {
  const extended = permission as Notifications.NotificationPermissionsStatus & {
    granted?: boolean;
  };
  return (
    extended.granted === true ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function registerForPushNotifications(accessToken: string) {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let granted = isNotificationPermissionGranted(existing);
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = isNotificationPermissionGranted(requested);
  }
  if (!granted) return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  await registerDeviceToken(accessToken, tokenData.data, platform);
  return tokenData.data;
}

export function parseDeepLink(
  url: string,
): { path: string; params: Record<string, string> } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'fitora:') return null;
    const path = parsed.hostname + parsed.pathname;
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return { path: path.replace(/^\//, ''), params };
  } catch {
    return null;
  }
}
