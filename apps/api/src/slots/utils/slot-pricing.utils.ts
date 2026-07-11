import { ClosureReason, SlotPricingRuleType } from '@prisma/client';

export interface PricingRuleInput {
  id: string;
  type: SlotPricingRuleType;
  name: string;
  multiplier: number;
  fixedPrice: number | null;
  startHour: number | null;
  endHour: number | null;
  daysOfWeek: number[];
  holidayDate: Date | null;
  priority: number;
  isActive: boolean;
}

export interface ClosureInput {
  id: string;
  startDate: Date;
  endDate: Date;
  reason: ClosureReason;
  isFullDay: boolean;
  startHour: number | null;
  endHour: number | null;
}

export interface SlotTimeWindow {
  startTime: Date;
  endTime: Date;
}

/** Resolve final slot price from base price and active pricing rules */
export function resolveSlotPrice(
  basePrice: number,
  slotStart: Date,
  rules: PricingRuleInput[],
): { price: number; appliedRule: PricingRuleInput | null } {
  const active = rules.filter((r) => r.isActive);
  const matching = active
    .filter((rule) => ruleMatchesSlot(rule, slotStart))
    .sort((a, b) => b.priority - a.priority);

  const rule = matching[0] ?? null;
  if (!rule) return { price: basePrice, appliedRule: null };

  if (rule.fixedPrice !== null) {
    return { price: rule.fixedPrice, appliedRule: rule };
  }

  const price = Math.round(basePrice * rule.multiplier * 100) / 100;
  return { price, appliedRule: rule };
}

export function ruleMatchesSlot(rule: PricingRuleInput, slotStart: Date): boolean {
  const day = slotStart.getUTCDay();
  const hour = slotStart.getUTCHours();
  const dateStr = slotStart.toISOString().slice(0, 10);

  switch (rule.type) {
    case SlotPricingRuleType.HOLIDAY:
      if (!rule.holidayDate) return false;
      return rule.holidayDate.toISOString().slice(0, 10) === dateStr;

    case SlotPricingRuleType.WEEKEND:
      return day === 0 || day === 6;

    case SlotPricingRuleType.PEAK: {
      if (rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(day)) return false;
      if (rule.startHour === null || rule.endHour === null) return false;
      return hour >= rule.startHour && hour < rule.endHour;
    }

    default:
      return false;
  }
}

/** Check if a slot falls within a closure window */
export function isSlotClosed(
  slotStart: Date,
  slotEnd: Date,
  closures: ClosureInput[],
): ClosureInput | null {
  const slotDate = slotStart.toISOString().slice(0, 10);
  const startHour = slotStart.getUTCHours();
  const endHour = slotEnd.getUTCHours() || (slotEnd.getUTCHours() === 0 ? 24 : slotEnd.getUTCHours());

  for (const closure of closures) {
    const closureStart = closure.startDate.toISOString().slice(0, 10);
    const closureEnd = closure.endDate.toISOString().slice(0, 10);

    if (slotDate < closureStart || slotDate > closureEnd) continue;

    if (closure.isFullDay) return closure;

    if (closure.startHour !== null && closure.endHour !== null) {
      if (startHour < closure.endHour && endHour > closure.startHour) {
        return closure;
      }
    }
  }

  return null;
}

export function buildSlotWindows(
  date: string,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  durationMinutes: number,
): SlotTimeWindow[] {
  const baseDate = new Date(`${date}T00:00:00.000Z`);
  const slots: SlotTimeWindow[] = [];
  const cursor = new Date(baseDate);
  cursor.setUTCHours(startHour, startMinute, 0, 0);

  const dayEnd = new Date(baseDate);
  dayEnd.setUTCHours(endHour, endMinute, 0, 0);

  while (cursor < dayEnd) {
    const endTime = new Date(cursor.getTime() + durationMinutes * 60_000);
    if (endTime > dayEnd) break;
    slots.push({ startTime: new Date(cursor), endTime });
    cursor.setTime(endTime.getTime());
  }

  return slots;
}

export function eachDateInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function scheduleAppliesOnDate(
  daysOfWeek: number[],
  date: string,
  validFrom: Date | null,
  validUntil: Date | null,
): boolean {
  const d = new Date(`${date}T00:00:00.000Z`);
  const day = d.getUTCDay();

  if (!daysOfWeek.includes(day)) return false;
  if (validFrom && d < validFrom) return false;
  if (validUntil && d > validUntil) return false;
  return true;
}

export function validateHourRange(startHour: number, endHour: number, label = 'hours'): void {
  if (startHour < 0 || startHour > 23 || endHour < 1 || endHour > 24) {
    throw new Error(`${label} must be within valid range`);
  }
  if (endHour <= startHour) {
    throw new Error('endHour must be greater than startHour');
  }
}

export function validateDaysOfWeek(days: number[]): void {
  if (days.length === 0) throw new Error('At least one day of week is required');
  if (days.some((d) => d < 0 || d > 6)) {
    throw new Error('daysOfWeek must be 0 (Sunday) through 6 (Saturday)');
  }
}
