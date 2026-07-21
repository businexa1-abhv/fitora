import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CourtSlot } from '@fitora/shared';
import { getRealtimeSocket, type LiveSlotUpdated } from '@/lib/realtime';

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

    const onUpdated = (payload: LiveSlotUpdated) => {
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
      payload: LiveSlotUpdated | { id?: string; slotId?: string; courtId: string },
    ) => {
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

    const onConnect = () => {
      subscribe();
      reconcile();
    };

    subscribe();
    socket.on('connect', onConnect);
    socket.on('slot:updated', onUpdated);
    socket.on('slot.updated', onUpdated);
    socket.on('slot.created', onUpdated);
    socket.on('slot.blocked', onUpdated);
    socket.on('slot.unblocked', onUpdated);
    socket.on('slot.closed', onUpdated);
    socket.on('slot.full', onUpdated);
    socket.on('slot.available', onUpdated);
    socket.on('slot.booked', onUpdated);
    socket.on('slot.cancelled', onUpdated);
    socket.on('slot.deleted', onDeleted);
    socket.on('slot:released', onReleased);

    return () => {
      socket.emit('unsubscribe:court', { courtId, date });
      socket.off('connect', onConnect);
      socket.off('slot:updated', onUpdated);
      socket.off('slot.updated', onUpdated);
      socket.off('slot.created', onUpdated);
      socket.off('slot.blocked', onUpdated);
      socket.off('slot.unblocked', onUpdated);
      socket.off('slot.closed', onUpdated);
      socket.off('slot.full', onUpdated);
      socket.off('slot.available', onUpdated);
      socket.off('slot.booked', onUpdated);
      socket.off('slot.cancelled', onUpdated);
      socket.off('slot.deleted', onDeleted);
      socket.off('slot:released', onReleased);
    };
  }, [courtId, date, queryClient, token]);
}
