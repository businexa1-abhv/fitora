import type {
  AttendanceRecord,
  KidProfile,
  ParentDashboard,
  ProgressReport,
  TrainerDashboard,
  TrainingBatch,
  TrainingProgram,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getAgeGroupPresets() {
  return apiFetch<{ label: string; minAge: number; maxAge: number }[]>('/training/age-groups');
}

export function getTrainingPrograms(courtId?: string) {
  const qs = courtId ? `?courtId=${courtId}` : '';
  return apiFetch<TrainingProgram[]>(`/training/programs${qs}`);
}

export function getTrainingProgram(programId: string, token?: string) {
  return apiFetch<TrainingProgram>(`/training/programs/${programId}`, {}, token);
}

export function createTrainingProgram(
  token: string,
  courtId: string,
  data: {
    name: string;
    description?: string;
    sportType?: string;
    sportSlug?: string;
    sportId?: string;
    minAge: number;
    maxAge: number;
    fee: number;
  },
) {
  return apiFetch<TrainingProgram>(
    `/courts/${courtId}/training/programs`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function createTrainingBatch(
  token: string,
  programId: string,
  data: { name: string; schedule: string; trainerId: string; maxCapacity?: number },
) {
  return apiFetch<TrainingBatch>(
    `/training/programs/${programId}/batches`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function getTrainers() {
  return apiFetch<{ id: string; firstName: string; lastName: string; email: string }[]>(
    '/training/trainers',
  );
}

export function getParentDashboard(token: string) {
  return apiFetch<ParentDashboard>('/training/dashboard/parent', {}, token);
}

export function getTrainerDashboard(token: string) {
  return apiFetch<TrainerDashboard>('/training/dashboard/trainer', {}, token);
}

export function getOwnerTrainingDashboard(token: string) {
  return apiFetch<Record<string, unknown>>('/training/dashboard/owner', {}, token);
}

export function getMyKids(token: string) {
  return apiFetch<KidProfile[]>('/training/kids/mine', {}, token);
}

export function enrollKidNew(
  token: string,
  data: {
    batchId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
    school?: string;
    medicalNotes?: string;
    emergencyContact: string;
    emergencyPhone: string;
  },
) {
  return apiFetch<{ enrollment: unknown; payment: import('@fitora/shared').PaymentOrder; fee: string }>(
    '/training/enroll/new',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function enrollKid(token: string, kidId: string, batchId: string) {
  return apiFetch<{ enrollment: unknown; payment: import('@fitora/shared').PaymentOrder; fee: string }>(
    '/training/enroll',
    { method: 'POST', body: JSON.stringify({ kidId, batchId }) },
    token,
  );
}

export function getTrainerBatches(token: string) {
  return apiFetch<TrainingBatch[]>('/training/batches/mine', {}, token);
}

export function markAttendance(
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
  return apiFetch<{
    enrollmentId: string;
    records: AttendanceRecord[];
    summary: { present: number; absent: number; total: number; rate: number };
  }>(`/training/enrollments/${enrollmentId}/attendance`, {}, token);
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

export function publishProgressReport(token: string, reportId: string) {
  return apiFetch<ProgressReport>(
    `/training/progress-reports/${reportId}/publish`,
    { method: 'PATCH' },
    token,
  );
}
