import type {
  Coupon,
  CouponValidationResult,
  Membership,
  MembershipDashboard,
  MembershipPlan,
  MembershipUsage,
  PaginatedResponse,
  PlanBenefits,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getMembershipDashboard(token: string, courtId?: string) {
  const qs = courtId ? `?courtId=${courtId}` : '';
  return apiFetch<MembershipDashboard>(`/memberships/dashboard${qs}`, {}, token);
}

export function getMyMembershipPlans(token: string) {
  return apiFetch<MembershipPlan[]>('/memberships/plans/mine', {}, token);
}

export function getMembershipPlan(token: string, planId: string) {
  return apiFetch<MembershipPlan>(`/memberships/plans/${planId}`, {}, token);
}

export function createMembershipPlan(
  token: string,
  courtId: string,
  data: {
    name: string;
    description?: string;
    duration: string;
    price: number;
    maxBookings?: number;
    benefits?: PlanBenefits;
  },
) {
  return apiFetch<MembershipPlan>(
    `/courts/${courtId}/memberships`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function updateMembershipPlan(
  token: string,
  planId: string,
  data: Partial<{
    name: string;
    description: string;
    duration: string;
    price: number;
    maxBookings: number;
    benefits: PlanBenefits;
    isActive: boolean;
  }>,
) {
  return apiFetch<MembershipPlan>(
    `/memberships/plans/${planId}`,
    { method: 'PUT', body: JSON.stringify(data) },
    token,
  );
}

export function getPlanSubscribers(token: string, planId: string) {
  return apiFetch<(Membership & { user: { id: string; firstName: string; lastName: string; email: string } })[]>(
    `/memberships/plans/${planId}/subscribers`,
    {},
    token,
  );
}

export function getMyMemberships(token: string, activeOnly = false) {
  const qs = activeOnly ? '?activeOnly=true' : '';
  return apiFetch<Membership[]>(`/memberships/my${qs}`, {}, token);
}

export function getMembershipUsage(token: string, purchaseId: string) {
  return apiFetch<MembershipUsage>(`/memberships/${purchaseId}/usage`, {}, token);
}

export function purchaseMembership(
  token: string,
  data: { planId: string; couponCode?: string; autoRenew?: boolean },
) {
  return apiFetch<{ membership: Membership; payment: Record<string, unknown>; discount: number }>(
    '/memberships/purchase',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function renewMembership(token: string, purchaseId: string, couponCode?: string) {
  return apiFetch<{ membership: Membership; payment: Record<string, unknown> }>(
    `/memberships/${purchaseId}/renew`,
    { method: 'POST', body: JSON.stringify({ couponCode }) },
    token,
  );
}

export function validateMembershipCoupon(
  token: string,
  data: {
    code: string;
    appliesTo: 'MEMBERSHIP' | 'BOOKING';
    orderAmount: number;
    courtId?: string;
    planId?: string;
  },
) {
  return apiFetch<CouponValidationResult>(
    '/memberships/validate-coupon',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function listCoupons(token: string, params?: { codeType?: string; courtId?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.codeType) query.set('codeType', params.codeType);
  if (params?.courtId) query.set('courtId', params.courtId);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return apiFetch<PaginatedResponse<Coupon>>(`/memberships/coupons${qs ? `?${qs}` : ''}`, {}, token);
}

export function createCoupon(
  token: string,
  data: {
    code: string;
    codeType: 'PROMO' | 'CORPORATE';
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    description?: string;
    courtId?: string;
    companyName?: string;
    maxDiscount?: number;
    minOrderAmount?: number;
    usageLimit?: number;
    perUserLimit?: number;
    expiresAt?: string;
  },
) {
  return apiFetch<Coupon>(
    '/memberships/coupons',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function deactivateCoupon(token: string, couponId: string) {
  return apiFetch<Coupon>(
    `/memberships/coupons/${couponId}/deactivate`,
    { method: 'PATCH' },
    token,
  );
}
