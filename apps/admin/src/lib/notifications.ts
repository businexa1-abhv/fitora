import type { NotificationPreferences, NotificationItem, ScheduledNotificationItem } from '@fitora/shared';
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

export function getNotificationDeliveries(token: string, notificationId: string) {
  return apiFetch<Array<{ channel: string; status: string; sentAt: string | null; errorMessage?: string | null }>>(
    `/notifications/${notificationId}/deliveries`,
    {},
    token,
  );
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

export function adminBroadcast(
  token: string,
  data: {
    title: string;
    body: string;
    roles?: string[];
    userIds?: string[];
    channels?: string[];
  },
) {
  return apiFetch<{ sent: number; userIds: number }>(
    '/notifications/admin/broadcast',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function scheduleBroadcast(
  token: string,
  data: {
    title: string;
    body: string;
    scheduledAt: string;
    roles?: string[];
    userIds?: string[];
    channels?: string[];
  },
) {
  return apiFetch<ScheduledNotificationItem>(
    '/notifications/admin/schedule',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function listScheduledBroadcasts(token: string, page = 1) {
  return apiFetch<{
    items: ScheduledNotificationItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/notifications/admin/scheduled?page=${page}`, {}, token);
}

export function cancelScheduledBroadcast(token: string, id: string) {
  return apiFetch<ScheduledNotificationItem>(
    `/notifications/admin/scheduled/${id}`,
    { method: 'DELETE' },
    token,
  );
}

export function getNotificationQueueStatus(token: string) {
  return apiFetch<{
    mode: 'inline' | 'bullmq';
    redisConnected?: boolean;
    queues?: Array<{ name: string; label: string; counts: Record<string, number> }>;
    deadLetter?: { waiting: number; total: number };
  }>('/notifications/admin/queue-status', {}, token);
}

export function triggerNotificationJob(token: string, jobName: string) {
  return apiFetch(`/notifications/admin/jobs/${jobName}`, { method: 'POST' }, token);
}

export function sendBookingReminders(token: string) {
  return apiFetch<{ sent: number; checked: number }>(
    '/notifications/admin/reminders/bookings',
    { method: 'POST' },
    token,
  );
}
