import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  locationDone: 'fitora.onboarding.location',
  locationLabel: 'fitora.onboarding.locationLabel',
  city: 'fitora.onboarding.city',
  notificationsDone: 'fitora.onboarding.notifications',
  pendingPhone: 'fitora.onboarding.pendingPhone',
} as const;

export async function markLocationDone(payload?: {
  city?: string;
  locationLabel?: string;
}) {
  await AsyncStorage.setItem(KEYS.locationDone, '1');
  if (payload?.city) await AsyncStorage.setItem(KEYS.city, payload.city);
  if (payload?.locationLabel) {
    await AsyncStorage.setItem(KEYS.locationLabel, payload.locationLabel);
  }
}

export async function isLocationDone() {
  return (await AsyncStorage.getItem(KEYS.locationDone)) === '1';
}

export async function getStoredCity() {
  return AsyncStorage.getItem(KEYS.city);
}

export async function getStoredLocationLabel() {
  return AsyncStorage.getItem(KEYS.locationLabel);
}

export async function markNotificationsDone() {
  await AsyncStorage.setItem(KEYS.notificationsDone, '1');
}

export async function isNotificationsDone() {
  return (await AsyncStorage.getItem(KEYS.notificationsDone)) === '1';
}

export async function setPendingPhone(phone: string) {
  await AsyncStorage.setItem(KEYS.pendingPhone, phone);
}

export async function getPendingPhone() {
  return AsyncStorage.getItem(KEYS.pendingPhone);
}

export async function clearPendingPhone() {
  await AsyncStorage.removeItem(KEYS.pendingPhone);
}
