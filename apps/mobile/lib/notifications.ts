import type { NotificationItem, NotificationPreferences } from '@fitora/shared';
import { apiFetch } from './api';

export function listNotifications(token: string, page = 1) {
  return apiFetch<{
    items: NotificationItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/notifications?page=${page}`, {}, token);
}

export function getUnreadNotificationCount(token: string) {
  return apiFetch<{ count: number }>('/notifications/unread-count', {}, token);
}

export function getNotificationPreferences(token: string) {
  return apiFetch<NotificationPreferences>('/notifications/preferences', {}, token);
}

export function updateNotificationPreferences(
  token: string,
  data: Partial<NotificationPreferences>,
) {
  return apiFetch<NotificationPreferences>('/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token);
}

export function markNotificationRead(token: string, id: string) {
  return apiFetch<NotificationItem>(`/notifications/${id}/read`, { method: 'PATCH' }, token);
}

export function markAllNotificationsRead(token: string) {
  return apiFetch<{ success: boolean }>('/notifications/read-all', { method: 'POST' }, token);
}

export function registerDeviceToken(token: string, deviceToken: string, platform: string) {
  return apiFetch('/notifications/device-tokens', {
    method: 'POST',
    body: JSON.stringify({ token: deviceToken, platform }),
  }, token);
}
