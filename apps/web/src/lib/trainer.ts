import type {
  LeaveRequest,
  TrainerPerformance,
  TrainerProfileView,
  TrainerScheduleItem,
  TrainingNote,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getTrainerProfile(token: string) {
  return apiFetch<TrainerProfileView>('/trainers/me/profile', {}, token);
}

export function updateTrainerProfile(
  token: string,
  data: {
    bio?: string;
    yearsExperience?: number;
    specializations?: string[];
    certifications?: Record<string, unknown>[];
  },
) {
  return apiFetch<TrainerProfileView>(
    '/trainers/me/profile',
    { method: 'PUT', body: JSON.stringify(data) },
    token,
  );
}

export function getTrainerSchedule(token: string) {
  return apiFetch<{ items: TrainerScheduleItem[] }>('/trainers/me/schedule', {}, token);
}

export function getTrainerPerformance(token: string) {
  return apiFetch<TrainerPerformance>('/trainers/me/performance', {}, token);
}

export function listTrainingNotes(
  token: string,
  params?: { batchId?: string; enrollmentId?: string },
) {
  const qs = new URLSearchParams();
  if (params?.batchId) qs.set('batchId', params.batchId);
  if (params?.enrollmentId) qs.set('enrollmentId', params.enrollmentId);
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<TrainingNote[]>(`/trainers/me/notes${query}`, {}, token);
}

export function createTrainingNote(
  token: string,
  data: {
    batchId?: string;
    enrollmentId?: string;
    sessionDate?: string;
    title?: string;
    content: string;
    isPrivate?: boolean;
  },
) {
  return apiFetch<TrainingNote>(
    '/trainers/me/notes',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function updateTrainingNote(
  token: string,
  noteId: string,
  data: { title?: string; content?: string; isPrivate?: boolean; sessionDate?: string },
) {
  return apiFetch<TrainingNote>(
    `/trainers/me/notes/${noteId}`,
    { method: 'PUT', body: JSON.stringify(data) },
    token,
  );
}

export function deleteTrainingNote(token: string, noteId: string) {
  return apiFetch<{ success: boolean }>(
    `/trainers/me/notes/${noteId}`,
    { method: 'DELETE' },
    token,
  );
}

export function listLeaveRequests(token: string) {
  return apiFetch<LeaveRequest[]>('/trainers/me/leave-requests', {}, token);
}

export function createLeaveRequest(
  token: string,
  data: { startDate: string; endDate: string; reason: string },
) {
  return apiFetch<LeaveRequest>(
    '/trainers/me/leave-requests',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function cancelLeaveRequest(token: string, leaveId: string) {
  return apiFetch<LeaveRequest>(
    `/trainers/me/leave-requests/${leaveId}`,
    { method: 'DELETE' },
    token,
  );
}

export function getBatchAttendanceForDate(token: string, batchId: string, date: string) {
  return apiFetch<{
    batchId: string;
    date: string;
    enrollments: {
      enrollmentId: string;
      kid: { id: string; firstName: string; lastName: string };
      record: { present: boolean; notes: string | null } | null;
    }[];
  }>(`/trainers/batches/${batchId}/attendance?date=${date}`, {}, token);
}
