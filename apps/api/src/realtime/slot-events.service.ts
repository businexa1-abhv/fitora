import { Injectable, Logger } from '@nestjs/common';
import type { AvailabilityStatus } from '../availability/utils/availability-status.util';

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
};

/**
 * Thin event bus for slot realtime.
 * Phase 1 ships with in-process listeners; Socket.IO gateway subscribes when enabled.
 */
@Injectable()
export class SlotEventsService {
  private readonly logger = new Logger(SlotEventsService.name);
  private readonly listeners = new Set<(event: string, payload: unknown) => void>();

  onEvent(listener: (event: string, payload: unknown) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: string, payload: unknown) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (error) {
        this.logger.warn(`Slot event listener failed: ${String(error)}`);
      }
    }
  }

  async emitSlotUpdated(payload: SlotUpdatedPayload) {
    this.emit('slot:updated', payload);
  }

  async emitSlotReleased(payload: {
    slotId: string;
    courtId: string;
    reason: 'expired' | 'cancelled' | 'abandoned' | 'confirmed';
  }) {
    this.emit('slot:released', payload);
  }

  async emitBookingConfirmed(payload: {
    bookingId: string;
    userId: string;
    checkInCode: string;
    slotId: string;
    courtId: string;
  }) {
    this.emit('booking:confirmed', payload);
    this.emit('booking.created', payload);
  }

  async emitBookingCancelled(payload: {
    bookingId: string;
    userId: string;
    slotId: string;
    courtId: string;
    refundAmount: number;
  }) {
    this.emit('booking:cancelled', payload);
    this.emit('booking.cancelled', payload);
  }

  async emitAttendanceUpdated(payload: {
    bookingId: string;
    userId: string;
    courtId: string;
    slotId: string;
    checkedInAt: Date | string;
  }) {
    this.emit('attendance:updated', payload);
    this.emit('attendance.updated', payload);
  }

  async emitMembershipUpdated(payload: {
    membershipId: string;
    userId: string;
    courtId: string;
    status: string;
  }) {
    this.emit('membership.updated', payload);
  }

  async emitPaymentUpdated(payload: {
    paymentId: string;
    userId: string;
    courtId?: string | null;
    status: string;
    amount?: number;
  }) {
    this.emit('payment.updated', payload);
  }

  async emitCoachUpdated(payload: { coachId: string; courtId?: string | null; action: string }) {
    this.emit('coach.updated', payload);
  }

  async emitPlayerUpdated(payload: { userId: string; courtId?: string | null; action: string }) {
    this.emit('player.updated', payload);
  }
}
