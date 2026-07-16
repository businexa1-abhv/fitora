import type {
  AttendanceRecord,
  LeaveRequest,
  TrainerDashboard,
  TrainerProfileView,
  TrainerScheduleItem,
  TrainingBatch,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getTrainerDashboard(token: string) {
  return apiFetch<TrainerDashboard>('/training/dashboard/trainer', {}, token);
}

export function getTrainerBatches(token: string) {
  return apiFetch<TrainingBatch[]>('/training/batches/mine', {}, token);
}

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

export function markBatchAttendance(
  token: string,
  batchId: string,
  data: {
    date: string;
    records: { enrollmentId: string; present: boolean; notes?: string }[];
  },
) {
  return apiFetch<{ marked: number; records: AttendanceRecord[] }>(
    `/training/batches/${batchId}/attendance`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}
