/** Minutes a PENDING booking holds the slot before auto-release */
export const BOOKING_LOCK_TTL_MINUTES = 15;

/** Refund policy tiers based on hours before slot start */
export const REFUND_RULES = [
  { minHoursBefore: 24, refundPercent: 100, label: 'Full refund (>24h before)' },
  { minHoursBefore: 12, refundPercent: 50, label: '50% refund (12–24h before)' },
  { minHoursBefore: 0, refundPercent: 0, label: 'No refund (<12h before)' },
] as const;

export function calculateRefundPercent(hoursUntilSlot: number): number {
  if (hoursUntilSlot >= 24) return 100;
  if (hoursUntilSlot >= 12) return 50;
  return 0;
}

export function calculateRefundAmount(totalPaid: number, hoursUntilSlot: number): number {
  const percent = calculateRefundPercent(hoursUntilSlot);
  return Math.round(totalPaid * (percent / 100) * 100) / 100;
}

export function hoursUntilSlot(slotStart: Date): number {
  return (slotStart.getTime() - Date.now()) / (1000 * 60 * 60);
}
