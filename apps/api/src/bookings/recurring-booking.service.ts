import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecurringBookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { eachDateInRange, scheduleAppliesOnDate } from '../slots/utils/slot-pricing.utils';
import { CreateRecurringBookingDto } from './dto/recurring-booking.dto';

const PREVIEW_OCCURRENCES = 4;

@Injectable()
export class RecurringBookingService {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
  ) {}

  async create(userId: string, dto: CreateRecurringBookingDto) {
    const court = await this.prisma.court.findFirst({
      where: { id: dto.courtId, deletedAt: null, isActive: true, isApproved: true },
    });
    if (!court) throw new NotFoundException('Court not found or not bookable');

    if (dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    let schedule: {
      id: string;
      daysOfWeek: number[];
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
      validFrom: Date | null;
      validUntil: Date | null;
    } | null = null;

    if (dto.slotScheduleId) {
      schedule = await this.prisma.slotSchedule.findFirst({
        where: {
          id: dto.slotScheduleId,
          courtId: dto.courtId,
          deletedAt: null,
          isActive: true,
        },
      });
      if (!schedule) throw new NotFoundException('Slot schedule not found');
    } else {
      if (dto.dayOfWeek === undefined || dto.startHour === undefined || dto.endHour === undefined) {
        throw new BadRequestException('Provide slotScheduleId or dayOfWeek + startHour + endHour');
      }
      if (dto.endHour <= dto.startHour) {
        throw new BadRequestException('endHour must be greater than startHour');
      }
    }

    const row = await this.prisma.recurringBooking.create({
      data: {
        userId,
        courtId: dto.courtId,
        slotScheduleId: dto.slotScheduleId ?? null,
        dayOfWeek: dto.dayOfWeek ?? null,
        startHour: dto.startHour ?? null,
        startMinute: dto.startMinute ?? 0,
        endHour: dto.endHour ?? null,
        endMinute: dto.endMinute ?? 0,
        seats: dto.seats ?? 1,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: RecurringBookingStatus.ACTIVE,
      },
      include: this.rowInclude(),
    });

    return this.formatRow(row);
  }

  async getMy(userId: string) {
    const rows = await this.prisma.recurringBooking.findMany({
      where: { userId, deletedAt: null, status: { not: RecurringBookingStatus.CANCELLED } },
      include: this.rowInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.formatRow(row)));
  }

  async cancel(id: string, userId: string) {
    const row = await this.prisma.recurringBooking.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Recurring booking not found');
    if (row.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own recurring bookings');
    }
    if (row.status === RecurringBookingStatus.CANCELLED) {
      throw new BadRequestException('Recurring booking is already cancelled');
    }

    const updated = await this.prisma.recurringBooking.update({
      where: { id },
      data: { status: RecurringBookingStatus.CANCELLED, deletedAt: new Date() },
      include: this.rowInclude(),
    });

    return this.formatRow(updated);
  }

  private rowInclude() {
    return {
      court: { select: { id: true, name: true, city: true } },
      slotSchedule: {
        select: {
          id: true,
          name: true,
          daysOfWeek: true,
          startHour: true,
          startMinute: true,
          endHour: true,
          endMinute: true,
          validFrom: true,
          validUntil: true,
        },
      },
    } as const;
  }

  private async formatRow(row: {
    id: string;
    userId: string;
    courtId: string;
    slotScheduleId: string | null;
    dayOfWeek: number | null;
    startHour: number | null;
    startMinute: number;
    endHour: number | null;
    endMinute: number;
    seats: number;
    startDate: Date;
    endDate: Date | null;
    status: RecurringBookingStatus;
    createdAt: Date;
    updatedAt: Date;
    court: { id: string; name: string; city: string };
    slotSchedule: {
      id: string;
      name: string;
      daysOfWeek: number[];
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
      validFrom: Date | null;
      validUntil: Date | null;
    } | null;
  }) {
    const preview = await this.buildPreview(row);
    return {
      id: row.id,
      userId: row.userId,
      courtId: row.courtId,
      slotScheduleId: row.slotScheduleId,
      dayOfWeek: row.dayOfWeek,
      startHour: row.startHour,
      startMinute: row.startMinute,
      endHour: row.endHour,
      endMinute: row.endMinute,
      seats: row.seats,
      startDate: row.startDate.toISOString().slice(0, 10),
      endDate: row.endDate?.toISOString().slice(0, 10) ?? null,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      court: row.court,
      slotSchedule: row.slotSchedule,
      preview,
    };
  }

  private async buildPreview(row: {
    courtId: string;
    slotScheduleId: string | null;
    dayOfWeek: number | null;
    startHour: number | null;
    startMinute: number;
    endHour: number | null;
    endMinute: number;
    seats: number;
    startDate: Date;
    endDate: Date | null;
    status: RecurringBookingStatus;
    slotSchedule: {
      daysOfWeek: number[];
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
      validFrom: Date | null;
      validUntil: Date | null;
    } | null;
  }) {
    if (row.status !== RecurringBookingStatus.ACTIVE) return [];

    const today = new Date().toISOString().slice(0, 10);
    const rangeStart = row.startDate.toISOString().slice(0, 10);
    const searchFrom = rangeStart > today ? rangeStart : today;
    const searchEndDate = new Date(searchFrom);
    searchEndDate.setUTCDate(searchEndDate.getUTCDate() + 90);
    const rangeEnd =
      row.endDate && row.endDate < searchEndDate
        ? row.endDate.toISOString().slice(0, 10)
        : searchEndDate.toISOString().slice(0, 10);

    const daysOfWeek =
      row.slotSchedule?.daysOfWeek ?? (row.dayOfWeek !== null ? [row.dayOfWeek] : []);
    const startHour = row.slotSchedule?.startHour ?? row.startHour ?? 0;
    const startMinute = row.slotSchedule?.startMinute ?? row.startMinute;
    const endHour = row.slotSchedule?.endHour ?? row.endHour ?? startHour + 1;
    const endMinute = row.slotSchedule?.endMinute ?? row.endMinute;
    const validFrom = row.slotSchedule?.validFrom ?? null;
    const validUntil = row.slotSchedule?.validUntil ?? null;

    const occurrences: Array<{
      date: string;
      startTime: string;
      endTime: string;
      slotId: string | null;
      availableSeats: number | null;
    }> = [];

    for (const date of eachDateInRange(searchFrom, rangeEnd)) {
      if (occurrences.length >= PREVIEW_OCCURRENCES) break;
      if (!scheduleAppliesOnDate(daysOfWeek, date, validFrom, validUntil)) continue;

      const startTime = new Date(`${date}T${padTime(startHour, startMinute)}:00.000Z`);
      const endTime = new Date(`${date}T${padTime(endHour, endMinute)}:00.000Z`);

      const slot = await this.prisma.courtSlot.findFirst({
        where: {
          courtId: row.courtId,
          deletedAt: null,
          startTime,
          endTime,
        },
        select: {
          id: true,
          capacity: true,
          reservedCount: true,
          confirmedCount: true,
          isBlocked: true,
        },
      });

      occurrences.push({
        date,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        slotId: slot?.id ?? null,
        availableSeats: slot
          ? slot.isBlocked
            ? 0
            : Math.max(0, slot.capacity - slot.reservedCount - slot.confirmedCount)
          : null,
      });
    }

    return occurrences;
  }
}

function padTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
