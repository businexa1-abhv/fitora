import { apiFetch } from './api';
import type { PaymentOrder } from '@fitora/shared';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  amount: number;
  gstRate: number;
  gst: number;
  total: number;
  features: Record<string, unknown>;
}

export interface OwnerSubscription {
  id: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  graceEndsAt: string | null;
  autoRenew: boolean;
  plan: SubscriptionPlan;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  brandName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  customDomain?: string | null;
  status?: string;
  isActive?: boolean;
  ownerId?: string;
}

export interface PurchaseSubscriptionResponse {
  subscription: OwnerSubscription;
  payment: PaymentOrder;
}

export function getSubscriptionPlans(token: string): Promise<SubscriptionPlan[]> {
  return apiFetch<SubscriptionPlan[]>('/subscriptions/plans', {}, token);
}

export function getMySubscription(token: string): Promise<OwnerSubscription | null> {
  return apiFetch<OwnerSubscription | null>('/subscriptions/my', {}, token).catch(() => null);
}

export function purchaseSubscription(
  token: string,
  planId: string,
  tenantId: string,
  autoRenew = false,
): Promise<PurchaseSubscriptionResponse> {
  return apiFetch<PurchaseSubscriptionResponse>(
    '/subscriptions/purchase',
    { method: 'POST', body: JSON.stringify({ planId, tenantId, autoRenew }) },
    token,
  );
}

export function getTenantMe(token: string): Promise<TenantInfo> {
  return apiFetch<TenantInfo>('/tenants/me', {}, token);
}
