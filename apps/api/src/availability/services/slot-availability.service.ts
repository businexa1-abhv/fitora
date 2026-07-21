import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingSource,
  BookingStatus,
  CourtApprovalStatus,
  PaymentStatus,
  SlotOperationalState,
  TenantStatus,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { RedisService } from '../../common/redis/redis.service';
import { BOOKING_LOCK_TTL_MINUTES } from '../../bookings/constants/refund-rules';
import {
  computeAvailabilityStatus,
  isBookableStatus,
  syncLegacyBlockFields,
} from '../utils/availability-status.util';
import { SlotHoldService } from './slot-hold.service';
import { SlotEventsService } from '../../realtime/slot-events.service';
import type { RealtimeEventEnvelope, SlotSnapshot } from '../../realtime/realtime.types';

export type ReserveSlotInput = {
  courtId: string;
  slotId: string;
  userId: string;
  seats?: number;
  couponId?: string;
  notes?: string;
  source?: BookingSource;
  guestName?: string;
  guestPhone?: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  /** Optimistic concurrency token from the client snapshot. */
  expectedVersion?: number;
};

export const SLOT_AVAILABILITY_CONFLICT = 'SLOT_AVAILABILITY_CONFLICT';

@Injectable()
export class SlotAvailabilityService {
  private readonly logger = new Logger(SlotAvailabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly holds: SlotHoldService,
    private readonly events: SlotEventsService,
  ) {}

  isEngineEnabled(): boolean {
    // Default ON — legacy path is unsafe under concurrency.
    return this.config.get<boolean>('AVAILABILITY_ENGINE_V2') !== false;
  }

  getLockTtlMinutes(): number {
    const override = this.config.get<number>('BOOKING_LOCK_TTL_MINUTES');
    return override && override > 0 ? override : BOOKING_LOCK_TTL_MINUTES;
  }

  availableSeats(slot: { capacity: number; reservedCount: number; confirmedCount: number }) {
    return Math.max(0, slot.capacity - slot.reservedCount - slot.confirmedCount);
  }

  formatAvailability(slot: {
    id: string;
    courtId: string;
    capacity: number;
    reservedCount: number;
    confirmedCount: number;
    isBlocked: boolean;
    blockReason?: string | null;
    operationalState?: SlotOperationalState | string | null;
    version?: number;
    startTime: Date;
    endTime: Date;
    price: Prisma.Decimal | string | number;
    court?: { tenantId?: string | null } | null;
  }) {
    const availableSeats = this.availableSeats(slot);
    const status = computeAvailabilityStatus({
      isBlocked: slot.isBlocked,
      blockReason: slot.blockReason,
      operationalState: slot.operationalState,
      capacity: slot.capacity,
      availableSeats,
      reservedSeats: slot.reservedCount,
    });
    return {
      id: slot.id,
      courtId: slot.courtId,
      tenantId: slot.court?.tenantId ?? null,
      venueId: slot.court?.tenantId ?? null,
      version: slot.version ?? 0,
      capacity: slot.capacity,
      reservedSeats: slot.reservedCount,
      confirmedSeats: slot.confirmedCount,
      availableSeats,
      bookedPlayers: slot.confirmedCount,
      availabilityStatus: status,
      operationalState: slot.operationalState ?? (slot.isBlocked ? 'BLOCKED' : 'AVAILABLE'),
      isBookable: isBookableStatus(status),
      isBooked: availableSeats === 0 || !isBookableStatus(status),
      isBlocked:
        slot.isBlocked || (slot.operationalState != null && slot.operationalState !== 'AVAILABLE'),
      blockReason: slot.blockReason,
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: String(slot.price),
    };
  }

  async findNearbyAvailableSlots(courtId: string, around: Date, excludeSlotId: string, limit = 3) {
    const windowStart = new Date(around.getTime() - 3 * 60 * 60_000);
    const windowEnd = new Date(around.getTime() + 6 * 60 * 60_000);
    const slots = await this.prisma.courtSlot.findMany({
      where: {
        courtId,
        deletedAt: null,
        id: { not: excludeSlotId },
        isBlocked: false,
        operationalState: SlotOperationalState.AVAILABLE,
        startTime: { gte: windowStart, lte: windowEnd },
      },
      orderBy: { startTime: 'asc' },
      take: 20,
    });
    return slots
      .map((s) => this.formatAvailability(s))
      .filter((s) => s.isBookable && s.availableSeats > 0)
      .slice(0, limit);
  }

  private conflictException(
    message: string,
    availability: ReturnType<SlotAvailabilityService['formatAvailability']>,
    nearby: Awaited<ReturnType<SlotAvailabilityService['findNearbyAvailableSlots']>>,
  ) {
    return new ConflictException({
      code: SLOT_AVAILABILITY_CONFLICT,
      message,
      slot: availability,
      nearbySlots: nearby,
    });
  }

  /** Authoritative reserve with SELECT FOR UPDATE */
  async reserve(input: ReserveSlotInput) {
    const seats = input.seats ?? 1;
    if (seats < 1) throw new BadRequestException('seats must be at least 1');

    const ttlMinutes = this.getLockTtlMinutes();
    const lockedUntil = new Date(Date.now() + ttlMinutes * 60_000);
    const holdToken = randomUUID();
    const pendingEnvelopes: RealtimeEventEnvelope<SlotSnapshot>[] = [];

    const booking = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM court_slots WHERE id = ${input.slotId}::uuid AND deleted_at IS NULL FOR UPDATE`;

      const slot = await tx.courtSlot.findFirst({
        where: { id: input.slotId, deletedAt: null },
        include: { court: { include: { sport: true } } },
      });
      if (!slot) throw new NotFoundException('Slot not found');
      if (slot.courtId !== input.courtId) {
        throw new BadRequestException('Slot does not belong to the specified court');
      }

      this.validateCourtAndSlot(slot);

      if (input.expectedVersion != null && slot.version !== input.expectedVersion) {
        const availability = this.formatAvailability(slot);
        const nearby = await this.findNearbyAvailableSlots(slot.courtId, slot.startTime, slot.id);
        throw this.conflictException(
          'This slot was just booked by another player.',
          availability,
          nearby,
        );
      }

      await this.reclaimUserExpiredHolds(tx, slot.id, input.userId);

      const fresh = await tx.courtSlot.findUniqueOrThrow({ where: { id: slot.id } });
      const available = this.availableSeats(fresh);
      if (available < seats) {
        const availability = this.formatAvailability(fresh);
        const nearby = await this.findNearbyAvailableSlots(
          fresh.courtId,
          fresh.startTime,
          fresh.id,
        );
        throw this.conflictException(
          'This slot was just booked by another player.',
          availability,
          nearby,
        );
      }

      const activeHolds = await tx.booking.count({
        where: {
          userId: input.userId,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          deletedAt: null,
          lockedUntil: { gt: new Date() },
        },
      });
      if (activeHolds >= 3) {
        throw new BadRequestException({
          code: 'TOO_MANY_HOLDS',
          message: 'Too many active slot holds. Complete or release an existing checkout.',
        });
      }

      const created = await tx.booking.create({
        data: {
          userId: input.userId,
          courtId: slot.courtId,
          slotId: slot.id,
          couponId: input.couponId,
          notes: input.notes,
          seats,
          source: input.source ?? BookingSource.PLAYER_APP,
          holdToken,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          subtotalAmount: input.subtotalAmount,
          discountAmount: input.discountAmount,
          totalAmount: input.totalAmount,
          lockedUntil,
        },
        include: {
          court: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
              ownerId: true,
              sport: { select: { id: true, name: true, slug: true } },
            },
          },
          slot: { select: { id: true, startTime: true, endTime: true, price: true } },
        },
      });

      await tx.courtSlot.update({
        where: { id: slot.id },
        data: {
          reservedCount: { increment: seats },
          version: { increment: 1 },
        },
      });

      const updatedSlot = await tx.courtSlot.findUniqueOrThrow({
        where: { id: slot.id },
        include: { court: { select: { tenantId: true } } },
      });
      const availability = this.formatAvailability(updatedSlot);
      pendingEnvelopes.push(
        await this.events.enqueueSlotLifecycleInTx(tx, 'slot.booked', availability),
      );
      pendingEnvelopes.push(
        await this.events.enqueueSlotLifecycleInTx(tx, 'slot.updated', availability),
      );

      return created;
    });

    await this.events.publishEnvelopes(pendingEnvelopes);

    await this.holds.setHold({
      slotId: input.slotId,
      holdToken,
      userId: input.userId,
      bookingId: booking.id,
      seats,
      expiresAt: lockedUntil,
    });

    const availability = await this.getSlotAvailability(input.courtId, input.slotId);

    return { booking, lockedUntil, holdToken, availability };
  }

  async confirmReservation(bookingId: string, checkInCode: string) {
    const pendingEnvelopes: RealtimeEventEnvelope<SlotSnapshot>[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: {
          court: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
              ownerId: true,
              sport: { select: { id: true, name: true, slug: true } },
            },
          },
          slot: true,
        },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      await tx.$executeRaw`SELECT id FROM court_slots WHERE id = ${booking.slotId}::uuid FOR UPDATE`;

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          checkInCode,
          lockedUntil: null,
        },
        include: {
          court: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
              ownerId: true,
              sport: { select: { id: true, name: true, slug: true } },
            },
          },
          slot: { select: { id: true, startTime: true, endTime: true, price: true } },
        },
      });

      await tx.courtSlot.update({
        where: { id: booking.slotId },
        data: {
          reservedCount: { decrement: booking.seats },
          confirmedCount: { increment: booking.seats },
          version: { increment: 1 },
        },
      });

      const updatedSlot = await tx.courtSlot.findUniqueOrThrow({
        where: { id: booking.slotId },
        include: { court: { select: { tenantId: true } } },
      });
      const availability = this.formatAvailability(updatedSlot);
      pendingEnvelopes.push(
        await this.events.enqueueSlotLifecycleInTx(tx, 'slot.updated', availability),
      );

      return {
        updated,
        holdToken: booking.holdToken,
        slotId: booking.slotId,
        courtId: booking.courtId,
      };
    });

    await this.events.publishEnvelopes(pendingEnvelopes);

    if (result.holdToken) {
      await this.holds.clearHold(result.slotId, result.holdToken, result.updated.userId);
    }

    const availability = await this.getSlotAvailability(result.courtId, result.slotId);
    await this.events.emitBookingConfirmed({
      bookingId: result.updated.id,
      userId: result.updated.userId,
      checkInCode,
      slotId: result.slotId,
      courtId: result.courtId,
    });

    return result.updated;
  }

  async releaseReservation(
    bookingId: string,
    opts?: { reason?: 'expired' | 'cancelled' | 'abandoned' },
  ) {
    const pendingEnvelopes: RealtimeEventEnvelope<SlotSnapshot>[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
      });
      if (!booking) return null;
      if (
        booking.status !== BookingStatus.PENDING ||
        booking.paymentStatus !== PaymentStatus.PENDING
      ) {
        return null;
      }

      await tx.$executeRaw`SELECT id FROM court_slots WHERE id = ${booking.slotId}::uuid FOR UPDATE`;

      await tx.booking.delete({ where: { id: booking.id } });
      await tx.courtSlot.update({
        where: { id: booking.slotId },
        data: {
          reservedCount: { decrement: booking.seats },
          version: { increment: 1 },
        },
      });

      const updatedSlot = await tx.courtSlot.findUniqueOrThrow({
        where: { id: booking.slotId },
        include: { court: { select: { tenantId: true } } },
      });
      const availability = this.formatAvailability(updatedSlot);
      pendingEnvelopes.push(
        await this.events.enqueueSlotLifecycleInTx(tx, 'slot.updated', availability),
      );
      pendingEnvelopes.push(
        await this.events.enqueueSlotLifecycleInTx(tx, 'slot.cancelled', availability),
      );

      return booking;
    });

    if (!result) return { released: false };

    await this.events.publishEnvelopes(pendingEnvelopes);

    if (result.holdToken) {
      await this.holds.clearHold(result.slotId, result.holdToken, result.userId);
    }

    const availability = await this.getSlotAvailability(result.courtId, result.slotId);
    await this.events.emitSlotReleased({
      slotId: result.slotId,
      courtId: result.courtId,
      reason: opts?.reason ?? 'cancelled',
    });

    return { released: true, bookingId: result.id };
  }

  async releaseConfirmedSeats(bookingId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({ where: { id: bookingId, deletedAt: null } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.paymentStatus !== PaymentStatus.PAID) return booking;

      await tx.$executeRaw`SELECT id FROM court_slots WHERE id = ${booking.slotId}::uuid FOR UPDATE`;
      await tx.courtSlot.update({
        where: { id: booking.slotId },
        data: {
          confirmedCount: { decrement: booking.seats },
          version: { increment: 1 },
        },
      });
      return booking;
    });

    const availability = await this.getSlotAvailability(result.courtId, result.slotId);
    await this.events.emitSlotUpdated(availability);
    await this.events.emitSlotCancelled(availability);
    return result;
  }

  async setOperationalState(
    courtId: string,
    slotId: string,
    state: SlotOperationalState,
    opts?: { expectedVersion?: number; notes?: string },
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM court_slots WHERE id = ${slotId}::uuid AND deleted_at IS NULL FOR UPDATE`;
      const slot = await tx.courtSlot.findFirst({
        where: { id: slotId, courtId, deletedAt: null },
      });
      if (!slot) throw new NotFoundException('Slot not found');
      if (opts?.expectedVersion != null && slot.version !== opts.expectedVersion) {
        throw new ConflictException({
          code: SLOT_AVAILABILITY_CONFLICT,
          message: 'Slot was modified by another update. Refresh and try again.',
          slot: this.formatAvailability(slot),
        });
      }

      const legacy = syncLegacyBlockFields(state);
      return tx.courtSlot.update({
        where: { id: slotId },
        data: {
          operationalState: state,
          isBlocked: legacy.isBlocked,
          blockReason: legacy.blockReason,
          ...(opts?.notes !== undefined ? { notes: opts.notes } : {}),
          version: { increment: 1 },
        },
        include: { court: { select: { tenantId: true } } },
      });
    });

    const availability = this.formatAvailability(updated);
    if (state === SlotOperationalState.AVAILABLE) {
      await this.events.emitSlotUnblocked(availability);
    } else if (state === SlotOperationalState.CLOSED) {
      await this.events.emitSlotClosed(availability);
    } else if (state === SlotOperationalState.MAINTENANCE) {
      await this.events.emitSlotMaintenance(availability);
    } else if (state === SlotOperationalState.TOURNAMENT) {
      await this.events.emitSlotTournament(availability);
    } else {
      await this.events.emitSlotBlocked(availability);
    }
    await this.events.emitSlotUpdated(availability);
    return availability;
  }

  async updateCapacity(
    courtId: string,
    slotId: string,
    capacity: number,
    opts?: { expectedVersion?: number },
  ) {
    if (capacity < 1) throw new BadRequestException('capacity must be at least 1');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM court_slots WHERE id = ${slotId}::uuid AND deleted_at IS NULL FOR UPDATE`;
      const slot = await tx.courtSlot.findFirst({
        where: { id: slotId, courtId, deletedAt: null },
      });
      if (!slot) throw new NotFoundException('Slot not found');
      const occupied = slot.reservedCount + slot.confirmedCount;
      if (capacity < occupied) {
        throw new BadRequestException(`Cannot set capacity below occupied seats (${occupied})`);
      }
      if (opts?.expectedVersion != null && slot.version !== opts.expectedVersion) {
        throw new ConflictException({
          code: SLOT_AVAILABILITY_CONFLICT,
          message: 'Slot was modified by another update. Refresh and try again.',
        });
      }
      return tx.courtSlot.update({
        where: { id: slotId },
        data: { capacity, version: { increment: 1 } },
        include: { court: { select: { tenantId: true } } },
      });
    });

    const availability = this.formatAvailability(updated);
    await this.events.emitSlotCapacityChanged(availability);
    await this.events.emitSlotUpdated(availability);
    return availability;
  }

  async releaseExpiredLocks() {
    const now = new Date();
    const ttl = this.getLockTtlMinutes();
    const expired = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        deletedAt: null,
        OR: [
          { lockedUntil: { lt: now } },
          {
            lockedUntil: null,
            createdAt: { lt: new Date(now.getTime() - ttl * 60_000) },
          },
        ],
      },
      select: { id: true },
    });

    let released = 0;
    for (const row of expired) {
      const res = await this.releaseReservation(row.id, { reason: 'expired' });
      if (res.released) released += 1;
    }
    return { released };
  }

  async getSlotAvailability(courtId: string, slotId: string) {
    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: slotId, courtId, deletedAt: null },
      include: { court: { select: { tenantId: true } } },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    return this.formatAvailability(slot);
  }

  async getVenueAvailability(venueId: string, date?: string) {
    const dayStart = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const courts = await this.prisma.court.findMany({
      where: { tenantId: venueId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });
    const courtIds = courts.map((c) => c.id);
    if (courtIds.length === 0) {
      return { venueId, date: date ?? dayStart.toISOString().slice(0, 10), courts: [], slots: [] };
    }

    const slots = await this.prisma.courtSlot.findMany({
      where: {
        courtId: { in: courtIds },
        deletedAt: null,
        startTime: { gte: dayStart, lte: dayEnd },
      },
      include: { court: { select: { tenantId: true, name: true } } },
      orderBy: { startTime: 'asc' },
    });

    const formatted = slots.map((s) => this.formatAvailability(s));
    return {
      venueId,
      date: date ?? dayStart.toISOString().slice(0, 10),
      courts,
      slots: formatted,
      summary: this.summarizeSlots(formatted),
    };
  }

  summarizeSlots(slots: Array<ReturnType<SlotAvailabilityService['formatAvailability']>>) {
    const total = slots.length;
    const booked = slots.filter(
      (s) => s.confirmedSeats > 0 || s.availabilityStatus === 'FULL',
    ).length;
    const available = slots.filter((s) => s.isBookable).length;
    const blocked = slots.filter((s) => s.availabilityStatus === 'BLOCKED').length;
    const maintenance = slots.filter((s) => s.availabilityStatus === 'MAINTENANCE').length;
    const reserved = slots.filter((s) => s.availabilityStatus === 'RESERVED').length;
    const capacity = slots.reduce((sum, s) => sum + s.capacity, 0);
    const occupied = slots.reduce((sum, s) => sum + s.confirmedSeats + s.reservedSeats, 0);
    return {
      totalSlots: total,
      bookedSlots: booked,
      availableSlots: available,
      blockedSlots: blocked,
      maintenanceSlots: maintenance,
      reservedSlots: reserved,
      occupancyPercent: capacity === 0 ? 0 : Math.round((occupied / capacity) * 100),
    };
  }

  async forceCloseCourtSlots(courtId: string, date: string) {
    const slots = await this.slotsForCourtDate(courtId, date);
    let updated = 0;
    for (const slot of slots) {
      await this.setOperationalState(courtId, slot.id, SlotOperationalState.CLOSED);
      updated += 1;
    }
    return { courtId, date, updated };
  }

  async forceOpenCourtSlots(courtId: string, date: string) {
    const slots = await this.prisma.courtSlot.findMany({
      where: {
        courtId,
        deletedAt: null,
        startTime: this.dayRange(date),
        operationalState: { in: [SlotOperationalState.CLOSED, SlotOperationalState.BLOCKED] },
      },
      select: { id: true },
    });
    let updated = 0;
    for (const slot of slots) {
      await this.setOperationalState(courtId, slot.id, SlotOperationalState.AVAILABLE);
      updated += 1;
    }
    return { courtId, date, updated };
  }

  async getAdminOccupancyMonitor(date?: string, tenantId?: string) {
    const day = date ?? new Date().toISOString().slice(0, 10);
    const tenants = tenantId
      ? await this.prisma.tenant.findMany({
          where: { id: tenantId, deletedAt: null },
          select: { id: true, name: true, brandName: true },
        })
      : await this.prisma.tenant.findMany({
          where: { deletedAt: null, status: TenantStatus.ACTIVE, isActive: true },
          select: { id: true, name: true, brandName: true },
          take: 50,
        });

    const venues = await Promise.all(
      tenants.map(async (tenant) => {
        const availability = await this.getVenueAvailability(tenant.id, day);
        const peakHours = this.computePeakHours(availability.slots);
        return {
          venueId: tenant.id,
          venueName: tenant.brandName || tenant.name,
          ...availability.summary,
          peakHours,
        };
      }),
    );

    return { date: day, venues };
  }

  private computePeakHours(
    slots: Array<ReturnType<SlotAvailabilityService['formatAvailability']>>,
  ) {
    const byHour = new Map<number, { total: number; occupied: number }>();
    for (const slot of slots) {
      const hour = new Date(slot.startTime).getUTCHours();
      const row = byHour.get(hour) ?? { total: 0, occupied: 0 };
      row.total += slot.capacity;
      row.occupied += slot.confirmedSeats + slot.reservedSeats;
      byHour.set(hour, row);
    }
    return [...byHour.entries()]
      .map(([hour, stats]) => ({
        hour,
        occupancyPercent: stats.total === 0 ? 0 : Math.round((stats.occupied / stats.total) * 100),
      }))
      .sort((a, b) => b.occupancyPercent - a.occupancyPercent)
      .slice(0, 5);
  }

  private dayRange(date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 59, 59, 999);
    return { gte: dayStart, lte: dayEnd };
  }

  private async slotsForCourtDate(courtId: string, date: string) {
    return this.prisma.courtSlot.findMany({
      where: { courtId, deletedAt: null, startTime: this.dayRange(date) },
      select: { id: true },
    });
  }

  async reconcileSlotCounters(slotId?: string) {
    const slots = await this.prisma.courtSlot.findMany({
      where: { deletedAt: null, ...(slotId ? { id: slotId } : {}) },
      select: { id: true, capacity: true, reservedCount: true, confirmedCount: true },
      take: slotId ? 1 : 500,
    });

    let repaired = 0;
    for (const slot of slots) {
      const [confirmed, reserved] = await Promise.all([
        this.prisma.booking.aggregate({
          where: {
            slotId: slot.id,
            deletedAt: null,
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
            paymentStatus: PaymentStatus.PAID,
          },
          _sum: { seats: true },
        }),
        this.prisma.booking.aggregate({
          where: {
            slotId: slot.id,
            deletedAt: null,
            status: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            lockedUntil: { gt: new Date() },
          },
          _sum: { seats: true },
        }),
      ]);

      const confirmedCount = confirmed._sum.seats ?? 0;
      const reservedCount = reserved._sum.seats ?? 0;

      if (confirmedCount !== slot.confirmedCount || reservedCount !== slot.reservedCount) {
        this.logger.warn(
          `Counter drift on slot ${slot.id}: reserved ${slot.reservedCount}->${reservedCount}, confirmed ${slot.confirmedCount}->${confirmedCount}`,
        );
        await this.prisma.courtSlot.update({
          where: { id: slot.id },
          data: { reservedCount, confirmedCount },
        });
        repaired += 1;
      }
    }
    return { repaired, scanned: slots.length };
  }

  private validateCourtAndSlot(slot: {
    isBlocked: boolean;
    operationalState?: SlotOperationalState | string | null;
    startTime: Date;
    court: { deletedAt: Date | null; approvalStatus: CourtApprovalStatus; isActive: boolean };
  }) {
    if (slot.court.deletedAt || slot.court.approvalStatus !== CourtApprovalStatus.APPROVED) {
      throw new BadRequestException('Court is not available for booking');
    }
    if (!slot.court.isActive) throw new BadRequestException('Court is not active');
    const status = computeAvailabilityStatus({
      isBlocked: slot.isBlocked,
      operationalState: slot.operationalState,
      capacity: 1,
      availableSeats: 1,
    });
    if (!isBookableStatus(status)) {
      throw new BadRequestException(`Slot is not bookable (${status})`);
    }
    if (slot.startTime <= new Date()) throw new BadRequestException('Cannot book a past slot');
  }

  private async reclaimUserExpiredHolds(
    tx: Prisma.TransactionClient,
    slotId: string,
    userId: string,
  ) {
    const now = new Date();
    const expired = await tx.booking.findMany({
      where: {
        slotId,
        userId,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        deletedAt: null,
        OR: [{ lockedUntil: { lt: now } }, { lockedUntil: null }],
      },
    });
    for (const row of expired) {
      await tx.booking.delete({ where: { id: row.id } });
      await tx.courtSlot.update({
        where: { id: slotId },
        data: { reservedCount: { decrement: row.seats } },
      });
    }
  }
}
