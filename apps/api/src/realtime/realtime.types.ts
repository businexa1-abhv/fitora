import { randomUUID } from 'crypto';
import type { AvailabilityStatus } from '../availability/utils/availability-status.util';

/** Canonical realtime events for the availability engine. */
export type RealtimeEventType =
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
  | 'booking.created'
  | 'booking.cancelled'
  | 'booking.confirmed'
  | 'attendance.updated'
  | 'waitlist.promoted'
  | 'community.message'
  | 'community.typing'
  | 'community.presence'
  | 'community.match.updated'
  | 'community.join_request'
  | 'community.announcement'
  | 'community.reaction';

/** Canonical slot snapshot broadcast to clients. */
export type SlotSnapshot = {
  id: string;
  courtId: string;
  tenantId?: string | null;
  venueId?: string | null;
  version: number;
  capacity: number;
  reservedSeats: number;
  confirmedSeats: number;
  availableSeats: number;
  bookedPlayers: number;
  availabilityStatus: AvailabilityStatus;
  operationalState: string;
  isBookable: boolean;
  isBooked: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  price: string;
  nearbySlotIds?: string[];
};

export type RealtimeEventEnvelope<T = unknown> = {
  eventId: string;
  event: RealtimeEventType;
  occurredAt: string;
  slotVersion?: number;
  tenantId?: string | null;
  venueId?: string | null;
  courtId?: string | null;
  slotId?: string | null;
  data: T;
};

export function createEventId(): string {
  return randomUUID();
}

export function wrapRealtimeEvent<T>(
  event: RealtimeEventType,
  data: T,
  meta?: Partial<Omit<RealtimeEventEnvelope<T>, 'eventId' | 'event' | 'occurredAt' | 'data'>>,
): RealtimeEventEnvelope<T> {
  return {
    eventId: createEventId(),
    event,
    occurredAt: new Date().toISOString(),
    data,
    ...meta,
  };
}

/** Legacy colon-form aliases emitted alongside canonical events during migration. */
export const LEGACY_EVENT_ALIASES: Partial<Record<RealtimeEventType, string[]>> = {
  'slot.updated': ['slot:updated'],
  'slot.cancelled': ['slot:released'],
  'booking.confirmed': ['booking:confirmed'],
  'booking.cancelled': ['booking:cancelled'],
  'attendance.updated': ['attendance:updated'],
};
