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
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { RedisService } from '../../common/redis/redis.service';
import { BOOKING_LOCK_TTL_MINUTES } from '../../bookings/constants/refund-rules';
import { computeAvailabilityStatus } from '../utils/availability-status.util';
import { SlotHoldService } from './slot-hold.service';
import { SlotEventsService } from '../../realtime/slot-events.service';

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
};

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
    return this.config.get<boolean>('AVAILABILITY_ENGINE_V2') === true;
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
    startTime: Date;
    endTime: Date;
    price: Prisma.Decimal | string | number;
  }) {
    const availableSeats = this.availableSeats(slot);
    const status = computeAvailabilityStatus({
      isBlocked: slot.isBlocked,
      blockReason: slot.blockReason,
      capacity: slot.capacity,
      availableSeats,
    });
    return {
      id: slot.id,
      courtId: slot.courtId,
      capacity: slot.capacity,
      reservedSeats: slot.reservedCount,
      confirmedSeats: slot.confirmedCount,
      availableSeats,
      availabilityStatus: status,
      isBooked: availableSeats === 0,
      isBlocked: slot.isBlocked,
      blockReason: slot.blockReason,
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: String(slot.price),
    };
  }

  /** Authoritative reserve with SELECT FOR UPDATE */
  async reserve(input: ReserveSlotInput) {
    const seats = input.seats ?? 1;
    if (seats < 1) throw new BadRequestException('seats must be at least 1');

    const ttlMinutes = this.getLockTtlMinutes();
    const lockedUntil = new Date(Date.now() + ttlMinutes * 60_000);
    const holdToken = randomUUID();

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

      // Reclaim caller's own expired holds on this slot
      await this.reclaimUserExpiredHolds(tx, slot.id, input.userId);

      const fresh = await tx.courtSlot.findUniqueOrThrow({ where: { id: slot.id } });
      const available = this.availableSeats(fresh);
      if (available < seats) {
        throw new ConflictException({
          code: 'SLOT_FULL',
          message: 'Slot has no remaining seats',
          availableSeats: available,
        });
      }

      // Cap concurrent holds per user
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

      return created;
    });

    await this.holds.setHold({
      slotId: input.slotId,
      holdToken,
      userId: input.userId,
      bookingId: booking.id,
      seats,
      expiresAt: lockedUntil,
    });

    const availability = await this.getSlotAvailability(input.courtId, input.slotId);
    await this.events.emitSlotUpdated(availability);

    return { booking, lockedUntil, holdToken, availability };
  }

  async confirmReservation(bookingId: string, checkInCode: string) {
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

      return {
        updated,
        holdToken: booking.holdToken,
        slotId: booking.slotId,
        courtId: booking.courtId,
      };
    });

    if (result.holdToken) {
      await this.holds.clearHold(result.slotId, result.holdToken, result.updated.userId);
    }

    const availability = await this.getSlotAvailability(result.courtId, result.slotId);
    await this.events.emitSlotUpdated(availability);
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

      return booking;
    });

    if (!result) return { released: false };

    if (result.holdToken) {
      await this.holds.clearHold(result.slotId, result.holdToken, result.userId);
    }

    const availability = await this.getSlotAvailability(result.courtId, result.slotId);
    await this.events.emitSlotUpdated(availability);
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
    return result;
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
    });
    if (!slot) throw new NotFoundException('Slot not found');
    return this.formatAvailability(slot);
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
        this.prisma.booking.count({
          where: {
            slotId: slot.id,
            deletedAt: null,
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
            paymentStatus: PaymentStatus.PAID,
          },
        }),
        this.prisma.booking.count({
          where: {
            slotId: slot.id,
            deletedAt: null,
            status: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            lockedUntil: { gt: new Date() },
          },
        }),
      ]);

      if (confirmed !== slot.confirmedCount || reserved !== slot.reservedCount) {
        this.logger.warn(
          `Counter drift on slot ${slot.id}: reserved ${slot.reservedCount}->${reserved}, confirmed ${slot.confirmedCount}->${confirmed}`,
        );
        await this.prisma.courtSlot.update({
          where: { id: slot.id },
          data: { reservedCount: reserved, confirmedCount: confirmed },
        });
        repaired += 1;
      }
    }
    return { repaired, scanned: slots.length };
  }

  private validateCourtAndSlot(slot: {
    isBlocked: boolean;
    startTime: Date;
    court: { deletedAt: Date | null; approvalStatus: CourtApprovalStatus; isActive: boolean };
  }) {
    if (slot.court.deletedAt || slot.court.approvalStatus !== CourtApprovalStatus.APPROVED) {
      throw new BadRequestException('Court is not available for booking');
    }
    if (!slot.court.isActive) throw new BadRequestException('Court is not active');
    if (slot.isBlocked) throw new BadRequestException('Slot is blocked');
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
