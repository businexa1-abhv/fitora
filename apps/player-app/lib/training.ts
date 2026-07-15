import type { PaymentOrder, TrainingBatch, TrainingProgram } from '@fitora/shared';
import { apiFetch } from './api';

export function getPrograms(courtId?: string) {
  const qs = courtId ? `?courtId=${courtId}` : '';
  return apiFetch<TrainingProgram[]>(`/training/programs${qs}`);
}

export function getProgram(token: string, programId: string) {
  return apiFetch<TrainingProgram & { batches: TrainingBatch[] }>(
    `/training/programs/${programId}`,
    {},
    token,
  );
}

export function enrollInBatch(
  token: string,
  batchId: string,
  data: {
    kidId?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    school?: string;
    medicalNotes?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    couponCode?: string;
  },
) {
  if (data.kidId) {
    return apiFetch<{ payment: PaymentOrder }>(
      '/training/enroll',
      {
        method: 'POST',
        body: JSON.stringify({ kidId: data.kidId, batchId, couponCode: data.couponCode }),
      },
      token,
    );
  }
  return apiFetch<{ payment: PaymentOrder }>(
    '/training/enroll/new',
    {
      method: 'POST',
      body: JSON.stringify({ ...data, batchId }),
    },
    token,
  );
}
