import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CourtSlot } from '@fitora/shared';
import { getRealtimeSocket, type LiveSlotUpdated } from '@/lib/realtime';

/** Server emits both raw slot snapshots and version-aware envelopes ({ event, data }). */
function unwrapPayload<T>(payload: T | { event: string; data: T }): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'event' in payload &&
    'data' in payload &&
    (payload as { data?: unknown }).data != null
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function patchSlot(existing: CourtSlot, update: LiveSlotUpdated): CourtSlot {
  const existingVersion = existing.version ?? 0;
  const nextVersion = update.version ?? existingVersion;
  if (update.version != null && nextVersion < existingVersion) {
    return existing;
  }
  return {
    ...existing,
    capacity: update.capacity ?? existing.capacity,
    availableSeats: update.availableSeats ?? existing.availableSeats,
    reservedSeats: update.reservedSeats ?? existing.reservedSeats,
    confirmedSeats: update.confirmedSeats ?? existing.confirmedSeats,
    bookedPlayers: update.bookedPlayers ?? existing.bookedPlayers,
    version: nextVersion,
    isBookable: update.isBookable ?? existing.isBookable,
    operationalState:
      (update.operationalState as CourtSlot['operationalState']) ?? existing.operationalState,
    availabilityStatus: update.availabilityStatus ?? existing.availabilityStatus,
    isBooked: update.isBooked,
    isBlocked: update.isBlocked,
    price: update.price ?? existing.price,
    startTime: update.startTime ?? existing.startTime,
    endTime: update.endTime ?? existing.endTime,
  };
}

/**
 * Subscribes to Socket.IO court room and patches TanStack `['slots', courtId, date]`.
 * On reconnect, reconciles with a single HTTP refetch (no polling).
 */
export function useCourtSlotsLive(
  courtId: string | undefined,
  date: string,
  token?: string | null,
) {
  const queryClient = useQueryClient();
  const versions = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!courtId) return;

    const socket = getRealtimeSocket(token ?? null);

    const subscribe = () => {
      socket.emit('subscribe:court', { courtId, date });
    };

    const reconcile = () => {
      void queryClient.invalidateQueries({ queryKey: ['slots', courtId, date] });
    };

    const onUpdated = (raw: LiveSlotUpdated | { event: string; data: LiveSlotUpdated }) => {
      const payload = unwrapPayload(raw);
      if (!payload?.id || payload.courtId !== courtId) return;

      const payloadDate = payload.startTime?.slice(0, 10);
      if (payloadDate && payloadDate !== date) return;

      const known = versions.current.get(payload.id) ?? 0;
      if (payload.version != null && payload.version < known) return;
      if (payload.version != null) versions.current.set(payload.id, payload.version);

      queryClient.setQueryData<CourtSlot[]>(['slots', courtId, date], (current) => {
        if (!current) {
          reconcile();
          return current;
        }
        const index = current.findIndex((slot) => slot.id === payload.id);
        if (index === -1) {
          reconcile();
          return current;
        }
        const next = current.slice();
        next[index] = patchSlot(next[index]!, payload);
        return next;
      });
    };

    const onDeleted = (
      raw: LiveSlotUpdated | { id?: string; slotId?: string; courtId: string },
    ) => {
      const payload = unwrapPayload(raw);
      const slotId =
        'id' in payload && payload.id ? payload.id : (payload as { slotId?: string }).slotId;
      if (!slotId || payload.courtId !== courtId) return;
      queryClient.setQueryData<CourtSlot[]>(['slots', courtId, date], (current) => {
        if (!current) return current;
        return current.filter((slot) => slot.id !== slotId);
      });
      versions.current.delete(slotId);
    };

    const onReleased = (payload: { slotId: string; courtId: string }) => {
      if (payload.courtId !== courtId) return;
      reconcile();
    };

    const onCourtUpdated = (raw: { courtId?: string } | { event: string; data: unknown }) => {
      const payload = unwrapPayload(raw) as { courtId?: string };
      if (payload?.courtId !== courtId) return;
      void queryClient.invalidateQueries({ queryKey: ['court', courtId] });
      reconcile();
    };

    const onVenueUpdated = (raw: { venueId?: string } | { event: string; data: unknown }) => {
      const payload = unwrapPayload(raw) as { venueId?: string };
      if (payload?.venueId) {
        void queryClient.invalidateQueries({ queryKey: ['venue', payload.venueId] });
      }
      reconcile();
    };

    const onConnect = () => {
      subscribe();
      reconcile();
    };

    const updateEvents = [
      'slot:updated',
      'slot.updated',
      'slot.created',
      'slot.blocked',
      'slot.unblocked',
      'slot.closed',
      'slot.full',
      'slot.available',
      'slot.booked',
      'slot.cancelled',
      'slot.capacity.changed',
      'slot.price.changed',
      'slot.maintenance',
      'slot.tournament',
    ] as const;

    subscribe();
    socket.on('connect', onConnect);
    for (const event of updateEvents) socket.on(event, onUpdated);
    socket.on('slot.deleted', onDeleted);
    socket.on('slot:released', onReleased);
    socket.on('court.updated', onCourtUpdated);
    socket.on('venue.updated', onVenueUpdated);

    return () => {
      socket.emit('unsubscribe:court', { courtId, date });
      socket.off('connect', onConnect);
      for (const event of updateEvents) socket.off(event, onUpdated);
      socket.off('slot.deleted', onDeleted);
      socket.off('slot:released', onReleased);
      socket.off('court.updated', onCourtUpdated);
      socket.off('venue.updated', onVenueUpdated);
    };
  }, [courtId, date, queryClient, token]);
}
