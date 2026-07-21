import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingSource,
  BookingStatus,
  IntegrationConflictType,
  IntegrationProvider,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { SlotAvailabilityService } from '../availability/services/slot-availability.service';
import type { IntegrationRequest } from './guards/integration-api-key.guard';
import type {
  ChannelCancelBookingDto,
  ChannelCreateBookingDto,
  ChannelHoldDto,
  ChannelReleaseDto,
} from './dto/integration.dto';

type ChannelIdentity = NonNullable<IntegrationRequest['integration']>;

@Injectable()
export class ChannelAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: SlotAvailabilityService,
  ) {}

  getAvailability(identity: ChannelIdentity, venueId: string, date?: string) {
    if (identity.tenantId !== venueId) throw new NotFoundException('Venue not found');
    return this.availability.getVenueAvailability(venueId, date);
  }

  async hold(identity: ChannelIdentity, dto: ChannelHoldDto) {
    const existing = await this.findIdempotent(identity.id, dto.idempotencyKey);
    if (existing) return this.holdResponse(existing);
    const slot = await this.slotForTenant(identity.tenantId, dto.courtId, dto.slotId);
    try {
      const result = await this.availability.reserve({
        courtId: dto.courtId,
        slotId: dto.slotId,
        userId: identity.ownerId,
        seats: dto.seats ?? 1,
        source: this.bookingSource(identity.provider),
        integrationId: identity.id,
        externalBookingId: dto.externalBookingId,
        externalIdempotencyKey: dto.idempotencyKey,
        subtotalAmount: Number(slot.price) * (dto.seats ?? 1),
        discountAmount: 0,
        totalAmount: Number(slot.price) * (dto.seats ?? 1),
        ttlMinutes: 5,
        bypassActiveHoldQuota: true,
      });
      return {
        bookingId: result.booking.id,
        holdToken: result.holdToken,
        expiresAt: result.lockedUntil,
        availability: result.availability,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.findIdempotent(identity.id, dto.idempotencyKey);
        if (duplicate) return this.holdResponse(duplicate);
      }
      await this.recordConflict(identity, dto, error);
      throw error;
    }
  }

  async release(identity: ChannelIdentity, dto: ChannelReleaseDto) {
    if (!dto.bookingId && !dto.idempotencyKey) {
      throw new BadRequestException('bookingId or idempotencyKey is required');
    }
    const booking = await this.resolveBooking(
      identity.id,
      dto.bookingId,
      undefined,
      dto.idempotencyKey,
    );
    const released = await this.availability.releaseReservation(booking.id, {
      reason: 'abandoned',
    });
    return released;
  }

  async createBooking(identity: ChannelIdentity, dto: ChannelCreateBookingDto) {
    const existing = await this.findIdempotent(identity.id, dto.idempotencyKey);
    if (existing?.status === BookingStatus.CONFIRMED)
      return { booking: existing, idempotent: true };

    const held =
      existing ??
      (await this.hold(identity, {
        courtId: dto.courtId,
        slotId: dto.slotId,
        seats: dto.seats,
        idempotencyKey: dto.idempotencyKey,
        externalBookingId: dto.externalBookingId,
      }));
    const bookingId = 'bookingId' in held ? held.bookingId : held.id;
    const checkInCode = `EXT${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const booking = await this.availability.confirmReservation(bookingId, checkInCode);
    return { booking, idempotent: false };
  }

  async cancelBooking(identity: ChannelIdentity, dto: ChannelCancelBookingDto) {
    if (!dto.bookingId && !dto.externalBookingId) {
      throw new BadRequestException('bookingId or externalBookingId is required');
    }
    const booking = await this.resolveBooking(
      identity.id,
      dto.bookingId,
      dto.externalBookingId,
      undefined,
    );
    if (booking.status === BookingStatus.CANCELLED) return { booking, idempotent: true };
    if (booking.status === BookingStatus.PENDING) {
      await this.availability.releaseReservation(booking.id, { reason: 'cancelled' });
      return { bookingId: booking.id, cancelled: true };
    }
    const updated = await this.availability.releaseConfirmedSeats(booking.id, {
      cancelReason: dto.reason ?? 'Cancelled by external channel',
    });
    return { booking: updated, idempotent: false };
  }

  private async slotForTenant(tenantId: string, courtId: string, slotId: string) {
    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: slotId, courtId, court: { tenantId }, deletedAt: null },
      select: { id: true, price: true },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    return slot;
  }

  private findIdempotent(integrationId: string, key: string) {
    return this.prisma.booking.findFirst({
      where: { integrationId, externalIdempotencyKey: key },
    });
  }

  private async resolveBooking(
    integrationId: string,
    bookingId?: string,
    externalBookingId?: string,
    idempotencyKey?: string,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        integrationId,
        ...(bookingId
          ? { id: bookingId }
          : externalBookingId
            ? { externalBookingId }
            : { externalIdempotencyKey: idempotencyKey }),
      },
    });
    if (!booking) throw new NotFoundException('External booking not found');
    return booking;
  }

  private holdResponse(booking: Awaited<ReturnType<ChannelAvailabilityService['findIdempotent']>>) {
    if (!booking) throw new ConflictException('Idempotent booking disappeared');
    return {
      bookingId: booking.id,
      holdToken: booking.holdToken,
      expiresAt: booking.lockedUntil,
      idempotent: true,
    };
  }

  private bookingSource(provider: string) {
    if (provider === IntegrationProvider.PLAYO) return BookingSource.PLAYO;
    if (provider === IntegrationProvider.PLAYARENA) return BookingSource.PLAYARENA;
    return BookingSource.EXTERNAL_CHANNEL;
  }

  private async recordConflict(identity: ChannelIdentity, dto: ChannelHoldDto, error: unknown) {
    await this.prisma.integrationConflict.create({
      data: {
        tenantId: identity.tenantId,
        integrationId: identity.id,
        slotId: dto.slotId,
        externalRef: dto.externalBookingId ?? dto.idempotencyKey,
        type:
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
            ? IntegrationConflictType.DUPLICATE_BOOKING
            : IntegrationConflictType.CAPACITY_MISMATCH,
        details: {
          message: error instanceof Error ? error.message : 'Availability conflict',
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
  }
}
