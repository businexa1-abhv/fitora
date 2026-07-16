'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CourtSlot } from '@fitora/shared';
import { getRealtimeSocket, type LiveSlotUpdated } from '@/lib/realtime';

function patchSlot(existing: CourtSlot, update: LiveSlotUpdated): CourtSlot {
  return {
    ...existing,
    capacity: update.capacity ?? existing.capacity,
    availableSeats: update.availableSeats ?? existing.availableSeats,
    reservedSeats: update.reservedSeats ?? existing.reservedSeats,
    confirmedSeats: update.confirmedSeats ?? existing.confirmedSeats,
    availabilityStatus: update.availabilityStatus ?? existing.availabilityStatus,
    isBooked: update.isBooked,
    isBlocked: update.isBlocked,
    price: update.price ?? existing.price,
    startTime: update.startTime ?? existing.startTime,
    endTime: update.endTime ?? existing.endTime,
  };
}

/**
 * Live-patches TanStack `['slots', courtId, date]` and invalidates owner booking queries.
 */
export function useCourtSlotsLive(
  courtId: string | undefined,
  date: string,
  token?: string | null,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!courtId || typeof window === 'undefined') return;

    const socket = getRealtimeSocket(token ?? null);

    const subscribe = () => {
      socket.emit('subscribe:court', { courtId, date });
    };

    const onUpdated = (payload: LiveSlotUpdated) => {
      if (!payload?.id || payload.courtId !== courtId) return;
      const payloadDate = payload.startTime?.slice(0, 10);
      if (payloadDate && payloadDate !== date) return;

      queryClient.setQueryData<CourtSlot[]>(['slots', courtId, date], (current) => {
        if (!current) {
          void queryClient.invalidateQueries({ queryKey: ['slots', courtId, date] });
          return current;
        }
        const index = current.findIndex((slot) => slot.id === payload.id);
        if (index === -1) {
          void queryClient.invalidateQueries({ queryKey: ['slots', courtId, date] });
          return current;
        }
        const next = current.slice();
        next[index] = patchSlot(next[index]!, payload);
        return next;
      });
    };

    const onBookingEvent = () => {
      void queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['slots', courtId, date] });
    };

    subscribe();
    socket.on('connect', subscribe);
    socket.on('slot:updated', onUpdated);
    socket.on('booking.created', onBookingEvent);
    socket.on('booking.cancelled', onBookingEvent);
    socket.on('attendance.updated', onBookingEvent);

    return () => {
      socket.emit('unsubscribe:court', { courtId, date });
      socket.off('connect', subscribe);
      socket.off('slot:updated', onUpdated);
      socket.off('booking.created', onBookingEvent);
      socket.off('booking.cancelled', onBookingEvent);
      socket.off('attendance.updated', onBookingEvent);
    };
  }, [courtId, date, queryClient, token]);
}
