import type { PaginatedResponse, PaymentRecord, PaymentReports } from '@fitora/shared';
import { apiFetch } from './api';

export function getAdminPayments(
  token: string,
  params?: { status?: string; entityType?: string; search?: string; page?: number },
) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.entityType) query.set('entityType', params.entityType);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return apiFetch<PaginatedResponse<PaymentRecord>>(
    `/payments/admin/list${qs ? `?${qs}` : ''}`,
    {},
    token,
  );
}

export function getPaymentReports(token: string, days = 30) {
  return apiFetch<PaymentReports>(`/payments/admin/reports?days=${days}`, {}, token);
}

export function refundPayment(token: string, paymentId: string, amount: number, reason?: string) {
  return apiFetch<PaymentRecord>(
    `/payments/${paymentId}/refund`,
    { method: 'POST', body: JSON.stringify({ amount, reason }) },
    token,
  );
}
