import { MembershipDuration } from '@prisma/client';

/** Default booking discount when plan benefits omit bookingDiscountPercent */
export const DEFAULT_BOOKING_DISCOUNT_PERCENT = 10;

export interface PlanBenefits {
  bookingDiscountPercent?: number;
  priorityBooking?: boolean;
  freeGuestPasses?: number;
  perks?: string[];
}

export function parsePlanBenefits(raw: unknown): PlanBenefits {
  if (!raw || typeof raw !== 'object') return {};
  const b = raw as Record<string, unknown>;
  return {
    bookingDiscountPercent:
      typeof b.bookingDiscountPercent === 'number' ? b.bookingDiscountPercent : undefined,
    priorityBooking: typeof b.priorityBooking === 'boolean' ? b.priorityBooking : undefined,
    freeGuestPasses: typeof b.freeGuestPasses === 'number' ? b.freeGuestPasses : undefined,
    perks: Array.isArray(b.perks) ? b.perks.filter((p): p is string => typeof p === 'string') : undefined,
  };
}

export function getBookingDiscountPercent(benefits: unknown): number {
  const parsed = parsePlanBenefits(benefits);
  const percent = parsed.bookingDiscountPercent ?? DEFAULT_BOOKING_DISCOUNT_PERCENT;
  return Math.min(100, Math.max(0, percent)) / 100;
}

export function addMembershipDuration(start: Date, duration: MembershipDuration): Date {
  const end = new Date(start);
  switch (duration) {
    case MembershipDuration.HOURLY:
      end.setHours(end.getHours() + 1);
      break;
    case MembershipDuration.DAILY:
      end.setDate(end.getDate() + 1);
      break;
    case MembershipDuration.MONTHLY:
      end.setMonth(end.getMonth() + 1);
      break;
    case MembershipDuration.QUARTERLY:
      end.setMonth(end.getMonth() + 3);
      break;
    case MembershipDuration.HALF_YEARLY:
      end.setMonth(end.getMonth() + 6);
      break;
    case MembershipDuration.ANNUAL:
      end.setFullYear(end.getFullYear() + 1);
      break;
  }
  return end;
}

export const DURATION_LABELS: Record<MembershipDuration, string> = {
  [MembershipDuration.HOURLY]: 'Hourly',
  [MembershipDuration.DAILY]: 'Daily',
  [MembershipDuration.MONTHLY]: 'Monthly',
  [MembershipDuration.QUARTERLY]: 'Quarterly',
  [MembershipDuration.HALF_YEARLY]: 'Half Yearly',
  [MembershipDuration.ANNUAL]: 'Yearly',
};
