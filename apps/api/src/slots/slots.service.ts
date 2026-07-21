import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { SubscriptionService } from '../finance/subscription/subscription.service';
import {
  BookingStatus,
  ClosureReason,
  PaymentStatus,
  Prisma,
  SlotBookingMode,
  SlotOperationalState,
  SlotPricingRuleType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { SlotAvailabilityService } from '../availability/services/slot-availability.service';
import {
  computeAvailabilityStatus,
  isBookableStatus,
  operationalStateFromBlockReason,
  syncLegacyBlockFields,
} from '../availability/utils/availability-status.util';
import {
  CalendarQueryDto,
  CreateClosureDto,
  CreatePricingRuleDto,
  CreateSlotDto,
  CreateSlotScheduleDto,
  GenerateRecurringSlotsDto,
  GenerateSlotsDto,
  SlotActionDto,
  UpdateClosureDto,
  UpdatePricingRuleDto,
  UpdateSlotDto,
  UpdateSlotScheduleDto,
} from './dto';
import {
  buildSlotWindows,
  eachDateInRange,
  isSlotClosed,
  resolveSlotPrice,
  scheduleAppliesOnDate,
  validateDaysOfWeek,
  type ClosureInput,
  type PricingRuleInput,
} from './utils/slot-pricing.utils';
import { SlotEventsService } from '../realtime/slot-events.service';

const SLOT_INCLUDE = {
  bookings: {
    where: { deletedAt: null, status: { not: BookingStatus.CANCELLED } },
    select: { id: true, status: true, paymentStatus: true, seats: true, lockedUntil: true },
  },
  court: { select: { tenantId: true } },
} as const;

type SlotRow = Prisma.CourtSlotGetPayload<{ include: typeof SLOT_INCLUDE }>;

@Injectable()
export class SlotsService {
  constructor(
    private prisma: PrismaService,
    private events: SlotEventsService,
    private availability: SlotAvailabilityService,
    @Inject(forwardRef(() => SubscriptionService))
    private subscriptions: SubscriptionService,
  ) {}

  // ─── Single & bulk slot creation ────────────────────────────────────────────

  async createSlot(courtId: string, dto: CreateSlotDto, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);
    if (court.tenantId) {
      await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
    if (startTime <= new Date()) {
      throw new BadRequestException('Cannot create slots in the past');
    }

    const basePrice =
      dto.price ?? (court.defaultSlotPrice ? Number(court.defaultSlotPrice) : undefined);
    if (basePrice === undefined) {
      throw new BadRequestException('price is required when court has no defaultSlotPrice');
    }

    const rules = await this.loadPricingRules(courtId);
    const closures = await this.loadClosures(courtId, startTime, startTime);
    const closure = isSlotClosed(startTime, endTime, closures);

    const { price } = resolveSlotPrice(basePrice, startTime, rules);
    const capacity =
      court.defaultSlotCapacity && court.defaultSlotCapacity > 0 ? court.defaultSlotCapacity : 1;
    const operationalState = operationalStateFromBlockReason(!!closure, closure?.reason ?? null);
    const legacy = syncLegacyBlockFields(operationalState);

    const slot = await this.prisma.courtSlot.create({
      data: {
        courtId,
        startTime,
        endTime,
        price,
        capacity,
        bookingMode: capacity > 1 ? SlotBookingMode.SHARED : SlotBookingMode.EXCLUSIVE,
        operationalState,
        isBlocked: legacy.isBlocked,
        blockReason: legacy.blockReason,
        notes: closure ? `Closed: ${closure.id}` : null,
      },
      include: SLOT_INCLUDE,
    });

    const formatted = this.formatSlot(slot);
    await this.events.emitSlotCreated(formatted);
    return formatted;
  }

  async generateSlots(courtId: string, dto: GenerateSlotsDto, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);
    if (court.tenantId) {
      await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
    }

    if (dto.endHour <= dto.startHour) {
      throw new BadRequestException('endHour must be greater than startHour');
    }

    const basePrice =
      dto.price ?? (court.defaultSlotPrice ? Number(court.defaultSlotPrice) : undefined);
    if (basePrice === undefined) {
      throw new BadRequestException('price is required when court has no defaultSlotPrice');
    }

    return this.createSlotsForDate(
      courtId,
      dto.date,
      dto.startHour,
      0,
      dto.endHour,
      0,
      dto.durationMinutes,
      basePrice,
    );
  }

  async generateRecurringSlots(
    courtId: string,
    dto: GenerateRecurringSlotsDto,
    user: AuthUserPayload,
  ) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);
    if (court.tenantId) {
      await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
    }

    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const dates = eachDateInRange(dto.startDate, dto.endDate);
    if (dates.length > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }

    const schedules = await this.prisma.slotSchedule.findMany({
      where: {
        courtId,
        deletedAt: null,
        isActive: true,
        ...(dto.scheduleIds?.length && { id: { in: dto.scheduleIds } }),
      },
    });

    if (schedules.length === 0) {
      throw new BadRequestException('No active recurring schedules found');
    }

    let totalCreated = 0;

    for (const date of dates) {
      for (const schedule of schedules) {
        if (
          !scheduleAppliesOnDate(schedule.daysOfWeek, date, schedule.validFrom, schedule.validUntil)
        ) {
          continue;
        }

        const result = await this.createSlotsForDate(
          courtId,
          date,
          schedule.startHour,
          schedule.startMinute,
          schedule.endHour,
          schedule.endMinute,
          schedule.durationMinutes,
          Number(schedule.basePrice),
          schedule.id,
        );
        totalCreated += result.created;
      }
    }

    return { created: totalCreated, datesProcessed: dates.length, schedules: schedules.length };
  }

  /** Cron-safe slot generation for active schedules (no auth). */
  async autoGenerateUpcomingSlots(daysAhead = 14) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setUTCDate(end.getUTCDate() + daysAhead);

    const startDate = today.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const schedules = await this.prisma.slotSchedule.findMany({
      where: { deletedAt: null, isActive: true },
      select: { courtId: true },
      distinct: ['courtId'],
    });

    let totalCreated = 0;
    let courtsProcessed = 0;

    for (const { courtId } of schedules) {
      const court = await this.prisma.court.findFirst({
        where: { id: courtId, deletedAt: null, isActive: true },
      });
      if (!court) continue;

      const result = await this.generateRecurringSlotsInternal(courtId, startDate, endDate);
      totalCreated += result.created;
      courtsProcessed += 1;
    }

    return { totalCreated, courtsProcessed, startDate, endDate };
  }

  private async generateRecurringSlotsInternal(
    courtId: string,
    startDate: string,
    endDate: string,
    scheduleIds?: string[],
  ) {
    const dates = eachDateInRange(startDate, endDate);
    const schedules = await this.prisma.slotSchedule.findMany({
      where: {
        courtId,
        deletedAt: null,
        isActive: true,
        ...(scheduleIds?.length && { id: { in: scheduleIds } }),
      },
    });

    if (schedules.length === 0) {
      return { created: 0, datesProcessed: dates.length, schedules: 0 };
    }

    let totalCreated = 0;

    for (const date of dates) {
      for (const schedule of schedules) {
        if (
          !scheduleAppliesOnDate(schedule.daysOfWeek, date, schedule.validFrom, schedule.validUntil)
        ) {
          continue;
        }

        const result = await this.createSlotsForDate(
          courtId,
          date,
          schedule.startHour,
          schedule.startMinute,
          schedule.endHour,
          schedule.endMinute,
          schedule.durationMinutes,
          Number(schedule.basePrice),
          schedule.id,
        );
        totalCreated += result.created;
      }
    }

    return { created: totalCreated, datesProcessed: dates.length, schedules: schedules.length };
  }

  async getSlots(courtId: string, date: string, user?: AuthUserPayload) {
    await this.assertCourtVisible(courtId, user);

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const slots = await this.prisma.courtSlot.findMany({
      where: {
        courtId,
        deletedAt: null,
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      include: SLOT_INCLUDE,
      orderBy: { startTime: 'asc' },
    });

    return slots.map((s) => this.formatSlot(s));
  }

  async getCalendar(courtId: string, query: CalendarQueryDto, user?: AuthUserPayload) {
    await this.assertCourtVisible(courtId, user);

    if (query.endDate < query.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const dates = eachDateInRange(query.startDate, query.endDate);
    if (dates.length > 62) {
      throw new BadRequestException('Calendar range cannot exceed 62 days');
    }

    const rangeStart = new Date(`${query.startDate}T00:00:00.000Z`);
    const rangeEnd = new Date(`${query.endDate}T23:59:59.999Z`);

    const [slots, closures] = await Promise.all([
      this.prisma.courtSlot.findMany({
        where: {
          courtId,
          deletedAt: null,
          startTime: { gte: rangeStart, lte: rangeEnd },
        },
        include: SLOT_INCLUDE,
      }),
      this.prisma.courtClosure.findMany({
        where: {
          courtId,
          deletedAt: null,
          startDate: { lte: rangeEnd },
          endDate: { gte: rangeStart },
        },
      }),
    ]);

    const slotsByDate = new Map<string, SlotRow[]>();
    for (const slot of slots) {
      const key = slot.startTime.toISOString().slice(0, 10);
      const list = slotsByDate.get(key) ?? [];
      list.push(slot);
      slotsByDate.set(key, list);
    }

    const days = dates.map((date) => {
      const daySlots = slotsByDate.get(date) ?? [];
      const dayClosures = closures.filter(
        (c) =>
          c.startDate.toISOString().slice(0, 10) <= date &&
          c.endDate.toISOString().slice(0, 10) >= date,
      );

      const booked = daySlots.filter((s) => this.isBooked(s)).length;
      const blocked = daySlots.filter((s) => s.isBlocked).length;
      const available = daySlots.filter((s) => !s.isBlocked && !this.isBooked(s)).length;

      return {
        date,
        totalSlots: daySlots.length,
        availableSlots: available,
        bookedSlots: booked,
        blockedSlots: blocked,
        hasClosure: dayClosures.length > 0,
        closures: dayClosures.map((c) => ({
          id: c.id,
          title: c.title,
          reason: c.reason,
          isFullDay: c.isFullDay,
        })),
        slots: daySlots.map((s) => this.formatSlot(s)),
      };
    });

    return { startDate: query.startDate, endDate: query.endDate, days };
  }

  async updateSlot(courtId: string, slotId: string, dto: UpdateSlotDto, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    const slot = await this.getSlot(courtId, slotId);
    const previousPrice = Number(slot.price);
    const previousCapacity = slot.capacity;

    if (
      dto.isBlocked === false &&
      slot.bookings.some((b) => b.paymentStatus === PaymentStatus.PAID)
    ) {
      throw new BadRequestException('Cannot unblock a slot with paid bookings');
    }

    if (dto.capacity != null) {
      return this.availability.updateCapacity(courtId, slotId, dto.capacity, {
        expectedVersion: dto.expectedVersion,
      });
    }

    if (dto.operationalState) {
      return this.availability.setOperationalState(
        courtId,
        slotId,
        dto.operationalState as SlotOperationalState,
        { expectedVersion: dto.expectedVersion, notes: dto.notes },
      );
    }

    if (dto.isBlocked !== undefined) {
      const state = operationalStateFromBlockReason(
        dto.isBlocked,
        dto.isBlocked ? 'BLOCKED' : null,
      );
      return this.availability.setOperationalState(courtId, slotId, state, {
        expectedVersion: dto.expectedVersion,
        notes: dto.notes,
      });
    }

    if (dto.startTime || dto.endTime) {
      const startTime = dto.startTime ? new Date(dto.startTime) : slot.startTime;
      const endTime = dto.endTime ? new Date(dto.endTime) : slot.endTime;
      if (endTime <= startTime) {
        throw new BadRequestException('endTime must be after startTime');
      }
    }

    const updated = await this.prisma.courtSlot.update({
      where: { id: slotId },
      data: {
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.startTime !== undefined && { startTime: new Date(dto.startTime) }),
        ...(dto.endTime !== undefined && { endTime: new Date(dto.endTime) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        version: { increment: 1 },
      },
      include: SLOT_INCLUDE,
    });

    const formatted = this.formatSlot(updated);
    if (dto.price !== undefined && Number(dto.price) !== previousPrice) {
      await this.events.emitSlotPriceChanged(formatted);
    }
    if (dto.capacity !== undefined && dto.capacity !== previousCapacity) {
      await this.events.emitSlotCapacityChanged(formatted);
    }
    await this.events.emitSlotUpdated(formatted);
    return formatted;
  }

  async getSlotById(slotId: string, user?: AuthUserPayload) {
    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: slotId, deletedAt: null },
      include: SLOT_INCLUDE,
    });
    if (!slot) throw new NotFoundException('Slot not found');
    await this.assertCourtVisible(slot.courtId, user);
    return this.formatSlot(slot);
  }

  async blockSlot(courtId: string, slotId: string, dto: SlotActionDto, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);
    const state = (dto.reason ?? 'BLOCKED') as SlotOperationalState;
    return this.availability.setOperationalState(courtId, slotId, state, {
      expectedVersion: dto.expectedVersion,
      notes: dto.notes,
    });
  }

  async unblockSlot(courtId: string, slotId: string, dto: SlotActionDto, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);
    return this.availability.setOperationalState(courtId, slotId, SlotOperationalState.AVAILABLE, {
      expectedVersion: dto.expectedVersion,
      notes: dto.notes,
    });
  }

  async openSlot(courtId: string, slotId: string, dto: SlotActionDto, user: AuthUserPayload) {
    return this.unblockSlot(courtId, slotId, dto, user);
  }

  async closeSlot(courtId: string, slotId: string, dto: SlotActionDto, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);
    return this.availability.setOperationalState(courtId, slotId, SlotOperationalState.CLOSED, {
      expectedVersion: dto.expectedVersion,
      notes: dto.notes,
    });
  }

  async removeSlot(courtId: string, slotId: string, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    const slot = await this.getSlot(courtId, slotId);
    if (slot.bookings.some((b) => b.paymentStatus === PaymentStatus.PAID)) {
      throw new BadRequestException('Cannot delete a booked slot');
    }
    if ((slot.reservedCount ?? 0) > 0 || (slot.confirmedCount ?? 0) > 0) {
      throw new BadRequestException('Cannot delete a slot with active reservations');
    }

    const formatted = this.formatSlot(slot);
    await this.prisma.courtSlot.update({
      where: { id: slotId },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
    await this.events.emitSlotDeleted(formatted);
    return { success: true, id: slotId };
  }

  // ─── Recurring schedules ────────────────────────────────────────────────────

  async listSchedules(courtId: string, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    return this.prisma.slotSchedule.findMany({
      where: { courtId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSchedule(courtId: string, dto: CreateSlotScheduleDto, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    try {
      validateDaysOfWeek(dto.daysOfWeek);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    if (dto.endHour <= dto.startHour) {
      throw new BadRequestException('endHour must be greater than startHour');
    }

    return this.prisma.slotSchedule.create({
      data: {
        courtId,
        name: dto.name,
        daysOfWeek: dto.daysOfWeek,
        startHour: dto.startHour,
        startMinute: dto.startMinute ?? 0,
        endHour: dto.endHour,
        endMinute: dto.endMinute ?? 0,
        durationMinutes: dto.durationMinutes,
        basePrice: dto.basePrice,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  async updateSchedule(
    courtId: string,
    scheduleId: string,
    dto: UpdateSlotScheduleDto,
    user: AuthUserPayload,
  ) {
    await this.getSchedule(courtId, scheduleId, user);

    if (dto.daysOfWeek) validateDaysOfWeek(dto.daysOfWeek);
    if (dto.startHour !== undefined && dto.endHour !== undefined && dto.endHour <= dto.startHour) {
      throw new BadRequestException('endHour must be greater than startHour');
    }

    return this.prisma.slotSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.daysOfWeek !== undefined && { daysOfWeek: dto.daysOfWeek }),
        ...(dto.startHour !== undefined && { startHour: dto.startHour }),
        ...(dto.startMinute !== undefined && { startMinute: dto.startMinute }),
        ...(dto.endHour !== undefined && { endHour: dto.endHour }),
        ...(dto.endMinute !== undefined && { endMinute: dto.endMinute }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.validFrom !== undefined && {
          validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        }),
        ...(dto.validUntil !== undefined && {
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        }),
      },
    });
  }

  async removeSchedule(courtId: string, scheduleId: string, user: AuthUserPayload) {
    await this.getSchedule(courtId, scheduleId, user);

    await this.prisma.slotSchedule.update({
      where: { id: scheduleId },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { success: true, id: scheduleId };
  }

  // ─── Pricing rules ──────────────────────────────────────────────────────────

  async listPricingRules(courtId: string, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    return this.prisma.slotPricingRule.findMany({
      where: { courtId, deletedAt: null },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createPricingRule(courtId: string, dto: CreatePricingRuleDto, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);
    this.validatePricingRule(dto);

    return this.prisma.slotPricingRule.create({
      data: {
        courtId,
        type: dto.type,
        name: dto.name,
        multiplier: dto.multiplier ?? 1,
        fixedPrice: dto.fixedPrice ?? null,
        startHour: dto.startHour ?? null,
        endHour: dto.endHour ?? null,
        daysOfWeek: dto.daysOfWeek ?? [],
        holidayDate: dto.holidayDate ? new Date(dto.holidayDate) : null,
        priority: dto.priority ?? 0,
      },
    });
  }

  async updatePricingRule(
    courtId: string,
    ruleId: string,
    dto: UpdatePricingRuleDto,
    user: AuthUserPayload,
  ) {
    await this.getPricingRule(courtId, ruleId, user);
    if (dto.type || dto.startHour !== undefined || dto.holidayDate) {
      this.validatePricingRule(dto as CreatePricingRuleDto);
    }

    return this.prisma.slotPricingRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.multiplier !== undefined && { multiplier: dto.multiplier }),
        ...(dto.fixedPrice !== undefined && { fixedPrice: dto.fixedPrice }),
        ...(dto.startHour !== undefined && { startHour: dto.startHour }),
        ...(dto.endHour !== undefined && { endHour: dto.endHour }),
        ...(dto.daysOfWeek !== undefined && { daysOfWeek: dto.daysOfWeek }),
        ...(dto.holidayDate !== undefined && {
          holidayDate: dto.holidayDate ? new Date(dto.holidayDate) : null,
        }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async removePricingRule(courtId: string, ruleId: string, user: AuthUserPayload) {
    await this.getPricingRule(courtId, ruleId, user);

    await this.prisma.slotPricingRule.update({
      where: { id: ruleId },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { success: true, id: ruleId };
  }

  // ─── Closures (blocked dates & maintenance) ─────────────────────────────────

  async listClosures(courtId: string, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    return this.prisma.courtClosure.findMany({
      where: { courtId, deletedAt: null },
      orderBy: { startDate: 'asc' },
    });
  }

  async createClosure(courtId: string, dto: CreateClosureDto, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const isFullDay = dto.isFullDay ?? true;
    if (!isFullDay && (dto.startHour === undefined || dto.endHour === undefined)) {
      throw new BadRequestException('startHour and endHour required for partial-day closures');
    }

    const closure = await this.prisma.courtClosure.create({
      data: {
        courtId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason ?? ClosureReason.BLOCKED,
        title: dto.title,
        notes: dto.notes,
        isFullDay,
        startHour: dto.startHour ?? null,
        endHour: dto.endHour ?? null,
      },
    });

    await this.applyClosureToExistingSlots(courtId, closure);
    return closure;
  }

  async updateClosure(
    courtId: string,
    closureId: string,
    dto: UpdateClosureDto,
    user: AuthUserPayload,
  ) {
    await this.getClosure(courtId, closureId, user);

    return this.prisma.courtClosure.update({
      where: { id: closureId },
      data: {
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isFullDay !== undefined && { isFullDay: dto.isFullDay }),
        ...(dto.startHour !== undefined && { startHour: dto.startHour }),
        ...(dto.endHour !== undefined && { endHour: dto.endHour }),
      },
    });
  }

  async removeClosure(courtId: string, closureId: string, user: AuthUserPayload) {
    await this.getClosure(courtId, closureId, user);

    await this.prisma.courtClosure.update({
      where: { id: closureId },
      data: { deletedAt: new Date() },
    });

    return { success: true, id: closureId };
  }

  // ─── Internal helpers ───────────────────────────────────────────────────────

  private async createSlotsForDate(
    courtId: string,
    date: string,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    durationMinutes: number,
    basePrice: number,
    scheduleId?: string,
  ) {
    const windows = buildSlotWindows(
      date,
      startHour,
      startMinute,
      endHour,
      endMinute,
      durationMinutes,
    );

    if (windows.length === 0) return { created: 0, total: 0 };

    const rules = await this.loadPricingRules(courtId);
    const rangeStart = new Date(`${date}T00:00:00.000Z`);
    const closures = await this.loadClosures(courtId, rangeStart, rangeStart);

    const court = await this.prisma.court.findFirst({
      where: { id: courtId, deletedAt: null },
      select: { defaultSlotCapacity: true },
    });
    const capacity =
      court?.defaultSlotCapacity && court.defaultSlotCapacity > 0 ? court.defaultSlotCapacity : 1;

    // Fetch all existing slots for this date in one query
    const startTimes = windows.map((w) => w.startTime);
    const existing = await this.prisma.courtSlot.findMany({
      where: { courtId, startTime: { in: startTimes }, deletedAt: null },
      select: { startTime: true },
    });
    const existingSet = new Set(existing.map((s) => s.startTime.toISOString()));

    // Build rows for new slots only
    const rows = windows
      .filter((w) => !existingSet.has(w.startTime.toISOString()))
      .map((w) => {
        const closure = isSlotClosed(w.startTime, w.endTime, closures);
        const { price, appliedRule } = resolveSlotPrice(basePrice, w.startTime, rules);
        const operationalState = operationalStateFromBlockReason(
          !!closure,
          closure?.reason ?? null,
        );
        const legacy = syncLegacyBlockFields(operationalState);
        return {
          courtId,
          scheduleId: scheduleId ?? null,
          startTime: w.startTime,
          endTime: w.endTime,
          price,
          capacity,
          bookingMode: capacity > 1 ? SlotBookingMode.SHARED : SlotBookingMode.EXCLUSIVE,
          operationalState,
          isBlocked: legacy.isBlocked,
          blockReason: legacy.blockReason,
          notes: appliedRule ? `Pricing: ${appliedRule.name}` : null,
        };
      });

    if (rows.length === 0) return { created: 0, total: windows.length };

    const { count } = await this.prisma.courtSlot.createMany({ data: rows, skipDuplicates: true });

    return { created: count, total: windows.length };
  }

  private async applyClosureToExistingSlots(
    courtId: string,
    closure: {
      id: string;
      startDate: Date;
      endDate: Date;
      reason: ClosureReason;
      isFullDay: boolean;
      startHour: number | null;
      endHour: number | null;
    },
  ) {
    const rangeStart = new Date(closure.startDate);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(closure.endDate);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const slots = await this.prisma.courtSlot.findMany({
      where: {
        courtId,
        deletedAt: null,
        startTime: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        bookings: {
          where: { deletedAt: null, paymentStatus: PaymentStatus.PAID },
          select: { id: true, paymentStatus: true },
        },
      },
    });

    const closureInput: ClosureInput = {
      id: closure.id,
      startDate: closure.startDate,
      endDate: closure.endDate,
      reason: closure.reason,
      isFullDay: closure.isFullDay,
      startHour: closure.startHour,
      endHour: closure.endHour,
    };

    for (const slot of slots) {
      if (slot.bookings.some((b) => b.paymentStatus === PaymentStatus.PAID)) continue;
      if (isSlotClosed(slot.startTime, slot.endTime, [closureInput])) {
        const state = operationalStateFromBlockReason(true, closure.reason);
        const legacy = syncLegacyBlockFields(state);
        const updated = await this.prisma.courtSlot.update({
          where: { id: slot.id },
          data: {
            operationalState: state,
            isBlocked: legacy.isBlocked,
            blockReason: legacy.blockReason,
            version: { increment: 1 },
          },
          include: SLOT_INCLUDE,
        });
        const formatted = this.formatSlot(updated);
        await this.events.emitSlotBlocked(formatted);
        await this.events.emitSlotUpdated(formatted);
      }
    }
  }

  private validatePricingRule(dto: CreatePricingRuleDto) {
    if (dto.type === SlotPricingRuleType.PEAK) {
      if (dto.startHour === undefined || dto.endHour === undefined) {
        throw new BadRequestException('Peak rules require startHour and endHour');
      }
      if (dto.endHour <= dto.startHour) {
        throw new BadRequestException('endHour must be greater than startHour');
      }
    }
    if (dto.type === SlotPricingRuleType.HOLIDAY && !dto.holidayDate) {
      throw new BadRequestException('Holiday rules require holidayDate');
    }
    if (dto.fixedPrice === undefined && (dto.multiplier === undefined || dto.multiplier <= 0)) {
      throw new BadRequestException('Provide fixedPrice or a positive multiplier');
    }
  }

  private async loadPricingRules(courtId: string): Promise<PricingRuleInput[]> {
    const rules = await this.prisma.slotPricingRule.findMany({
      where: { courtId, deletedAt: null, isActive: true },
    });
    return rules.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      multiplier: Number(r.multiplier),
      fixedPrice: r.fixedPrice ? Number(r.fixedPrice) : null,
      startHour: r.startHour,
      endHour: r.endHour,
      daysOfWeek: r.daysOfWeek,
      holidayDate: r.holidayDate,
      priority: r.priority,
      isActive: r.isActive,
    }));
  }

  private async loadClosures(courtId: string, from: Date, to: Date): Promise<ClosureInput[]> {
    const closures = await this.prisma.courtClosure.findMany({
      where: {
        courtId,
        deletedAt: null,
        startDate: { lte: to },
        endDate: { gte: from },
      },
    });
    return closures.map((c) => ({
      id: c.id,
      startDate: c.startDate,
      endDate: c.endDate,
      reason: c.reason,
      isFullDay: c.isFullDay,
      startHour: c.startHour,
      endHour: c.endHour,
    }));
  }

  private formatSlot(slot: SlotRow) {
    const capacity = slot.capacity ?? 1;
    const reservedCount = slot.reservedCount ?? 0;
    const confirmedCount = slot.confirmedCount ?? 0;
    const availableSeats = Math.max(0, capacity - reservedCount - confirmedCount);
    const availabilityStatus = computeAvailabilityStatus({
      isBlocked: slot.isBlocked,
      blockReason: slot.blockReason,
      operationalState: slot.operationalState,
      capacity,
      availableSeats,
    });
    const isBooked =
      this.isBooked(slot) || availableSeats === 0 || !isBookableStatus(availabilityStatus);

    return {
      id: slot.id,
      courtId: slot.courtId,
      tenantId: slot.court?.tenantId ?? null,
      venueId: slot.court?.tenantId ?? null,
      scheduleId: slot.scheduleId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: slot.price.toString(),
      capacity,
      reservedSeats: reservedCount,
      confirmedSeats: confirmedCount,
      availableSeats,
      bookedPlayers: confirmedCount,
      version: slot.version ?? 0,
      availabilityStatus,
      operationalState: slot.operationalState ?? (slot.isBlocked ? 'BLOCKED' : 'AVAILABLE'),
      isBookable: isBookableStatus(availabilityStatus),
      isBlocked: slot.isBlocked,
      blockReason: slot.blockReason,
      notes: slot.notes,
      isBooked,
    };
  }

  private isBooked(slot: SlotRow) {
    const capacity = slot.capacity ?? 1;
    if (capacity <= 1) {
      return slot.bookings.some(
        (b) =>
          b.status !== BookingStatus.CANCELLED &&
          (b.paymentStatus === PaymentStatus.PAID || b.status === BookingStatus.PENDING),
      );
    }
    const reserved = slot.reservedCount ?? 0;
    const confirmed = slot.confirmedCount ?? 0;
    return reserved + confirmed >= capacity;
  }

  private async getCourt(courtId: string) {
    const court = await this.prisma.court.findFirst({ where: { id: courtId, deletedAt: null } });
    if (!court) throw new NotFoundException('Court not found');
    return court;
  }

  private async assertCourtVisible(courtId: string, user?: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    const isAdmin = user?.roles.includes(UserRole.ADMIN);
    const isOwner = user?.id === court.ownerId;

    if (court.approvalStatus !== 'APPROVED' && !isAdmin && !isOwner) {
      throw new NotFoundException('Court not found');
    }
    if (!court.isActive && !isAdmin && !isOwner) {
      throw new NotFoundException('Court not found');
    }
  }

  private async getSlot(courtId: string, slotId: string) {
    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: slotId, courtId, deletedAt: null },
      include: SLOT_INCLUDE,
    });
    if (!slot) throw new NotFoundException('Slot not found');
    return slot;
  }

  private async getSchedule(courtId: string, scheduleId: string, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    const schedule = await this.prisma.slotSchedule.findFirst({
      where: { id: scheduleId, courtId, deletedAt: null },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  private async getPricingRule(courtId: string, ruleId: string, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    const rule = await this.prisma.slotPricingRule.findFirst({
      where: { id: ruleId, courtId, deletedAt: null },
    });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    return rule;
  }

  private async getClosure(courtId: string, closureId: string, user: AuthUserPayload) {
    const court = await this.getCourt(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    const closure = await this.prisma.courtClosure.findFirst({
      where: { id: closureId, courtId, deletedAt: null },
    });
    if (!closure) throw new NotFoundException('Closure not found');
    return closure;
  }

  private assertOwnerOrAdmin(ownerId: string, user: AuthUserPayload) {
    if (user.roles.includes(UserRole.ADMIN) || user.id === ownerId) return;
    throw new ForbiddenException('You do not have permission to manage slots for this court');
  }
}
