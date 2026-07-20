import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function isPermissionGranted(status: Notifications.NotificationPermissionsStatus) {
  const s = status as Notifications.NotificationPermissionsStatus & { granted?: boolean };
  return (
    s.granted === true ||
    s.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function registerForPushNotifications(accessToken: string) {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let granted = isPermissionGranted(existing);
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = isPermissionGranted(requested);
  }
  if (!granted) return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  await apiFetch(
    '/notifications/device-tokens',
    {
      method: 'POST',
      body: JSON.stringify({ token: tokenData.data, platform }),
    },
    accessToken,
  ).catch(() => null); // non-fatal if registration fails
  return tokenData.data;
}

export function parseDeepLink(
  url: string,
): { path: string; params: Record<string, string> } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'fitora:' && parsed.protocol !== 'fitora-owner:') return null;
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

const OWNER_SAFE_PATHS = [
  '(tabs)',
  'ops/',
  'manage/',
  'court/',
  'coach/',
  'notifications',
  'subscription-expired',
];

export function isSafeDeepLinkPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  if (path.includes('..') || path.startsWith('/')) return false;
  return OWNER_SAFE_PATHS.some((p) => path.startsWith(p));
}
