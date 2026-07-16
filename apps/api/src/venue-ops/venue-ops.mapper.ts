import {
  Expense,
  ExpensePaymentMethod,
  PayrollLine,
  PayrollPeriod,
  PlayerCrmProfile,
  PlayerNote,
  SlotTypeConfig,
  StaffShift,
  StaffShiftRole,
  User,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type ApiPaymentMethod = 'Cash' | 'Card' | 'UPI';
export type ApiStaffRole = 'Front Desk' | 'Coach' | 'Maintenance';
export type ApiPayrollLineStatus = 'PENDING' | 'PAID';

const PAYMENT_METHOD_TO_API: Record<ExpensePaymentMethod, ApiPaymentMethod> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
};

const PAYMENT_METHOD_FROM_API: Record<ApiPaymentMethod, ExpensePaymentMethod> = {
  Cash: 'CASH',
  Card: 'CARD',
  UPI: 'UPI',
};

const STAFF_ROLE_TO_API: Record<StaffShiftRole, ApiStaffRole> = {
  FRONT_DESK: 'Front Desk',
  COACH: 'Coach',
  MAINTENANCE: 'Maintenance',
};

const STAFF_ROLE_FROM_API: Record<ApiStaffRole, StaffShiftRole> = {
  'Front Desk': 'FRONT_DESK',
  Coach: 'COACH',
  Maintenance: 'MAINTENANCE',
};

export function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toNumber(value: Decimal | number | string | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
}

export function formatPaymentMethod(
  method: ExpensePaymentMethod | null | undefined,
): ApiPaymentMethod | undefined {
  if (!method) return undefined;
  return PAYMENT_METHOD_TO_API[method];
}

export function parsePaymentMethod(method: ApiPaymentMethod): ExpensePaymentMethod {
  return PAYMENT_METHOD_FROM_API[method];
}

export function formatStaffRole(role: StaffShiftRole): ApiStaffRole {
  return STAFF_ROLE_TO_API[role];
}

export function parseStaffRole(role: ApiStaffRole): StaffShiftRole {
  return STAFF_ROLE_FROM_API[role];
}

export function defaultRatePerSession(trainerId: string): number {
  let hash = 0;
  for (const char of trainerId) {
    hash = (hash + char.charCodeAt(0)) % 101;
  }
  return 400 + hash;
}

export function formatExpense(expense: Expense) {
  return {
    id: expense.id,
    tenantId: expense.tenantId,
    courtId: expense.courtId,
    createdById: expense.createdById,
    title: expense.title,
    category: expense.category,
    amount: toNumber(expense.amount),
    date: toDateString(expense.date),
    notes: expense.notes,
    paymentMethod: formatPaymentMethod(expense.paymentMethod),
    receiptUrl: expense.receiptUrl,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export function formatSlotType(slotType: SlotTypeConfig) {
  return {
    id: slotType.id,
    tenantId: slotType.tenantId,
    name: slotType.name,
    description: slotType.description,
    durationMin: slotType.durationMin,
    multiplier: toNumber(slotType.multiplier),
    color: slotType.color,
    sortOrder: slotType.sortOrder,
    isActive: slotType.isActive,
    createdAt: slotType.createdAt,
    updatedAt: slotType.updatedAt,
  };
}

export function formatStaffShift(shift: StaffShift) {
  return {
    id: shift.id,
    tenantId: shift.tenantId,
    staffUserId: shift.staffUserId,
    staffName: shift.staffName,
    role: formatStaffRole(shift.role),
    date: toDateString(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
    area: shift.area,
    notes: shift.notes,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  };
}

type TrainerSummary = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

export function formatPayrollLine(line: PayrollLine & { trainer: TrainerSummary }) {
  return {
    id: line.id,
    periodId: line.periodId,
    sessions: line.sessions,
    ratePerSession: toNumber(line.ratePerSession),
    commission: toNumber(line.commission),
    status: line.status as ApiPayrollLineStatus,
    paidAt: line.paidAt,
    trainer: {
      id: line.trainer.id,
      firstName: line.trainer.firstName,
      lastName: line.trainer.lastName,
      email: line.trainer.email,
    },
    createdAt: line.createdAt,
    updatedAt: line.updatedAt,
  };
}

export function formatPayrollPeriod(
  period: PayrollPeriod,
  lines: Array<PayrollLine & { trainer: TrainerSummary }>,
) {
  return {
    id: period.id,
    tenantId: period.tenantId,
    startDate: toDateString(period.startDate),
    endDate: toDateString(period.endDate),
    status: period.status,
    lines: lines.map(formatPayrollLine),
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
  };
}

export function formatPlayerNote(note: PlayerNote) {
  return {
    id: note.id,
    tenantId: note.tenantId,
    playerUserId: note.playerUserId,
    authorId: note.authorId,
    title: note.title,
    content: note.content,
    isPrivate: note.isPrivate,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function formatCrmProfile(profile: PlayerCrmProfile | null) {
  if (!profile) return null;
  return {
    id: profile.id,
    medicalNotes: profile.medicalNotes,
    skillLevel: profile.skillLevel,
    skillNotes: profile.skillNotes,
    updatedAt: profile.updatedAt,
  };
}
