import type {
  AttendanceRecord,
  LeaveRequest,
  ProgressReport,
  TrainerDashboard,
  TrainerPerformance,
  TrainerProfileView,
  TrainerScheduleItem,
  TrainingBatch,
  TrainingNote,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getTrainerDashboard(token: string) {
  return apiFetch<TrainerDashboard>('/training/dashboard/trainer', {}, token);
}

export function getTrainerPerformance(token: string) {
  return apiFetch<TrainerPerformance>('/trainers/me/performance', {}, token);
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

export function getEnrollmentAttendance(token: string, enrollmentId: string) {
  return apiFetch<AttendanceRecord[]>(
    `/training/enrollments/${enrollmentId}/attendance`,
    {},
    token,
  );
}

export function markEnrollmentAttendance(
  token: string,
  enrollmentId: string,
  data: { date: string; present: boolean; notes?: string },
) {
  return apiFetch<AttendanceRecord>(
    `/training/enrollments/${enrollmentId}/attendance`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function getProgressReports(token: string, enrollmentId: string) {
  return apiFetch<ProgressReport[]>(
    `/training/enrollments/${enrollmentId}/progress-reports`,
    {},
    token,
  );
}

export function createProgressReport(
  token: string,
  data: {
    enrollmentId: string;
    periodStart: string;
    periodEnd: string;
    summary: string;
    skills?: { skill: string; rating: number }[];
    rating?: number;
    publish?: boolean;
  },
) {
  return apiFetch<ProgressReport>(
    '/training/progress-reports',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function listTrainingNotes(
  token: string,
  params?: { batchId?: string; enrollmentId?: string },
) {
  const qs = new URLSearchParams();
  if (params?.batchId) qs.set('batchId', params.batchId);
  if (params?.enrollmentId) qs.set('enrollmentId', params.enrollmentId);
  const query = qs.toString();
  return apiFetch<TrainingNote[]>(`/trainers/me/notes${query ? `?${query}` : ''}`, {}, token);
}

export function createTrainingNote(
  token: string,
  data: {
    content: string;
    title?: string;
    enrollmentId?: string;
    batchId?: string;
    sessionDate?: string;
    isPrivate?: boolean;
  },
) {
  return apiFetch<TrainingNote>(
    '/trainers/me/notes',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}
