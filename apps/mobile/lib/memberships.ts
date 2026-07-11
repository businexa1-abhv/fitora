import type { Membership, MembershipPlan } from '@fitora/shared';
import { apiFetch } from './api';

export function getMyMemberships(token: string, activeOnly = false) {
  const qs = activeOnly ? '?activeOnly=true' : '';
  return apiFetch<Membership[]>(`/memberships/my${qs}`, {}, token);
}

export function purchaseMembership(
  token: string,
  planId: string,
  couponCode?: string,
) {
  return apiFetch('/memberships/purchase', {
    method: 'POST',
    body: JSON.stringify({ planId, couponCode }),
  }, token);
}

export function getMembershipPlan(token: string, planId: string) {
  return apiFetch<MembershipPlan>(`/memberships/plans/${planId}`, {}, token);
}
