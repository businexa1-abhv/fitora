import { Injectable, Logger } from '@nestjs/common';
import type { AvailabilityStatus } from '../availability/utils/availability-status.util';
import { isBookableStatus } from '../availability/utils/availability-status.util';
import { RealtimeOutboxService } from './realtime-outbox.service';
import type { RealtimeEventEnvelope, RealtimeEventType, SlotSnapshot } from './realtime.types';
import { LEGACY_EVENT_ALIASES, wrapRealtimeEvent } from './realtime.types';

/** @deprecated Prefer SlotSnapshot — kept for existing callers during migration. */
export type SlotUpdatedPayload = {
  id: string;
  courtId: string;
  capacity: number;
  reservedSeats: number;
  confirmedSeats: number;
  availableSeats: number;
  availabilityStatus: AvailabilityStatus;
  isBooked: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  price: string;
  version?: number;
  operationalState?: string;
  bookedPlayers?: number;
  isBookable?: boolean;
  tenantId?: string | null;
  venueId?: string | null;
};

/**
 * Realtime event bus for slot availability.
 * Emits both in-process (gateway) and durable outbox events.
 */
@Injectable()
export class SlotEventsService {
  private readonly logger = new Logger(SlotEventsService.name);
  private readonly listeners = new Set<(event: string, payload: unknown) => void>();

  constructor(private readonly outbox: RealtimeOutboxService) {}

  onEvent(listener: (event: string, payload: unknown) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitLocal(event: string, payload: unknown) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (error) {
        this.logger.warn(`Slot event listener failed: ${String(error)}`);
      }
    }
  }

  private emitCanonical(envelope: RealtimeEventEnvelope) {
    this.emitLocal(envelope.event, envelope);
    const aliases = LEGACY_EVENT_ALIASES[envelope.event] ?? [];
    for (const alias of aliases) {
      // Legacy payloads were the raw slot / booking object, not the envelope.
      this.emitLocal(alias, envelope.data);
    }
  }

  toSnapshot(payload: SlotUpdatedPayload): SlotSnapshot {
    const status = payload.availabilityStatus;
    return {
      id: payload.id,
      courtId: payload.courtId,
      tenantId: payload.tenantId ?? null,
      venueId: payload.venueId ?? payload.tenantId ?? null,
      version: payload.version ?? 0,
      capacity: payload.capacity,
      reservedSeats: payload.reservedSeats,
      confirmedSeats: payload.confirmedSeats,
      availableSeats: payload.availableSeats,
      bookedPlayers: payload.bookedPlayers ?? payload.confirmedSeats,
      availabilityStatus: status,
      operationalState: payload.operationalState ?? (payload.isBlocked ? 'BLOCKED' : 'AVAILABLE'),
      isBookable: payload.isBookable ?? isBookableStatus(status),
      isBooked: payload.isBooked,
      isBlocked: payload.isBlocked,
      blockReason: payload.blockReason,
      startTime: payload.startTime,
      endTime: payload.endTime,
      price: payload.price,
    };
  }

  async emitSlotLifecycle(
    event: Extract<
      RealtimeEventType,
      | 'slot.created'
      | 'slot.updated'
      | 'slot.deleted'
      | 'slot.blocked'
      | 'slot.unblocked'
      | 'slot.closed'
      | 'slot.capacity.changed'
      | 'slot.price.changed'
      | 'slot.booked'
      | 'slot.cancelled'
      | 'slot.available'
      | 'slot.full'
    >,
    payload: SlotUpdatedPayload,
  ) {
    const snapshot = this.toSnapshot(payload);
    const meta = {
      slotVersion: snapshot.version,
      tenantId: snapshot.tenantId,
      venueId: snapshot.venueId,
      courtId: snapshot.courtId,
      slotId: snapshot.id,
    };

    let envelope = wrapRealtimeEvent(event, snapshot, meta);
    try {
      envelope = (await this.outbox.enqueue(event, snapshot, meta)) as typeof envelope;
    } catch (error) {
      this.logger.warn(`Outbox enqueue failed, emitting locally only: ${String(error)}`);
    }

    this.emitCanonical(envelope);
    try {
      await this.outbox.markPublished(envelope.eventId);
    } catch {
      /* non-fatal */
    }

    if (event === 'slot.updated' || event === 'slot.booked' || event === 'slot.cancelled') {
      if (snapshot.availabilityStatus === 'FULL') {
        this.emitCanonical(wrapRealtimeEvent('slot.full', snapshot, meta));
      } else if (snapshot.isBookable) {
        this.emitCanonical(wrapRealtimeEvent('slot.available', snapshot, meta));
      }
    }
  }

  async emitSlotUpdated(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.updated', payload);
  }

  async emitSlotCreated(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.created', payload);
  }

  async emitSlotDeleted(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.deleted', payload);
  }

  async emitSlotBlocked(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.blocked', payload);
  }

  async emitSlotUnblocked(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.unblocked', payload);
  }

  async emitSlotClosed(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.closed', payload);
  }

  async emitSlotCapacityChanged(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.capacity.changed', payload);
  }

  async emitSlotPriceChanged(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.price.changed', payload);
  }

  async emitSlotBooked(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.booked', payload);
  }

  async emitSlotCancelled(payload: SlotUpdatedPayload) {
    await this.emitSlotLifecycle('slot.cancelled', payload);
  }

  async emitSlotReleased(payload: {
    slotId: string;
    courtId: string;
    reason: 'expired' | 'cancelled' | 'abandoned' | 'confirmed';
  }) {
    this.emitLocal('slot:released', payload);
    this.emitLocal('slot.cancelled', payload);
  }

  async emitBookingConfirmed(payload: {
    bookingId: string;
    userId: string;
    checkInCode: string;
    slotId: string;
    courtId: string;
  }) {
    const envelope = wrapRealtimeEvent('booking.confirmed', payload, {
      courtId: payload.courtId,
      slotId: payload.slotId,
    });
    try {
      await this.outbox.enqueue('booking.confirmed', payload, {
        courtId: payload.courtId,
        slotId: payload.slotId,
      });
    } catch {
      /* local fallback below */
    }
    this.emitCanonical(envelope);
    this.emitLocal('booking.created', payload);
  }

  async emitBookingCancelled(payload: {
    bookingId: string;
    userId: string;
    slotId: string;
    courtId: string;
    refundAmount: number;
  }) {
    const envelope = wrapRealtimeEvent('booking.cancelled', payload, {
      courtId: payload.courtId,
      slotId: payload.slotId,
    });
    try {
      await this.outbox.enqueue('booking.cancelled', payload, {
        courtId: payload.courtId,
        slotId: payload.slotId,
      });
    } catch {
      /* local fallback below */
    }
    this.emitCanonical(envelope);
  }

  async emitAttendanceUpdated(payload: {
    bookingId: string;
    userId: string;
    courtId: string;
    slotId: string;
    checkedInAt: Date | string;
  }) {
    const envelope = wrapRealtimeEvent('attendance.updated', payload, {
      courtId: payload.courtId,
      slotId: payload.slotId,
    });
    try {
      await this.outbox.enqueue('attendance.updated', payload, {
        courtId: payload.courtId,
        slotId: payload.slotId,
      });
    } catch {
      /* local fallback below */
    }
    this.emitCanonical(envelope);
  }

  async emitWaitlistPromoted(payload: {
    waitlistEntryId: string;
    userId: string;
    slotId: string;
    courtId: string;
    seats: number;
  }) {
    const envelope = wrapRealtimeEvent('waitlist.promoted', payload, {
      courtId: payload.courtId,
      slotId: payload.slotId,
    });
    try {
      await this.outbox.enqueue('waitlist.promoted', payload, {
        courtId: payload.courtId,
        slotId: payload.slotId,
      });
    } catch {
      /* local fallback below */
    }
    this.emitCanonical(envelope);
  }

  async emitMembershipUpdated(payload: {
    membershipId: string;
    userId: string;
    courtId: string;
    status: string;
  }) {
    this.emitLocal('membership.updated', payload);
  }

  async emitPaymentUpdated(payload: {
    paymentId: string;
    userId: string;
    courtId?: string | null;
    status: string;
    amount?: number;
  }) {
    this.emitLocal('payment.updated', payload);
  }

  async emitCoachUpdated(payload: { coachId: string; courtId?: string | null; action: string }) {
    this.emitLocal('coach.updated', payload);
  }

  async emitPlayerUpdated(payload: { userId: string; courtId?: string | null; action: string }) {
    this.emitLocal('player.updated', payload);
  }
}
