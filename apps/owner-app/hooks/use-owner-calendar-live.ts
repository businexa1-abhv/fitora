import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CalendarDay } from '@/lib/owner-api';
import { getRealtimeSocket, type LiveSlotUpdated } from '@/lib/realtime';

type CalendarResponse = {
  startDate: string;
  endDate: string;
  days: CalendarDay[];
};

type CalendarSlot = CalendarDay['slots'][number];

function patchSlot(existing: CalendarSlot, update: LiveSlotUpdated): CalendarSlot {
  return {
    ...existing,
    startTime: update.startTime ?? existing.startTime,
    endTime: update.endTime ?? existing.endTime,
    price: update.price ?? existing.price,
    isBlocked: update.isBlocked,
    isBooked: update.isBooked,
    capacity: update.capacity ?? existing.capacity,
    availableSeats: update.availableSeats ?? existing.availableSeats,
    reservedSeats: update.reservedSeats ?? existing.reservedSeats,
    confirmedSeats: update.confirmedSeats ?? existing.confirmedSeats,
    availabilityStatus: update.availabilityStatus ?? existing.availabilityStatus,
  };
}

function recountDay(day: CalendarDay): CalendarDay {
  const bookedSlots = day.slots.filter((s) => s.isBooked && !s.isBlocked).length;
  const blockedSlots = day.slots.filter((s) => s.isBlocked).length;
  const availableSlots = day.slots.filter((s) => !s.isBooked && !s.isBlocked).length;
  return {
    ...day,
    totalSlots: day.slots.length,
    bookedSlots,
    blockedSlots,
    availableSlots,
  };
}

function patchCalendar(
  current: CalendarResponse | undefined,
  update: LiveSlotUpdated,
): CalendarResponse | undefined | 'miss' {
  if (!current?.days) return current;

  let found = false;
  const days = current.days.map((day) => {
    const index = day.slots.findIndex((slot) => slot.id === update.id);
    if (index === -1) return day;
    found = true;
    const slots = day.slots.slice();
    slots[index] = patchSlot(slots[index]!, update);
    return recountDay({ ...day, slots });
  });

  if (!found) return 'miss';
  return { ...current, days };
}

/**
 * Live-patches TanStack `['owner','calendar', courtId, …]` from Socket.IO `slot:updated`.
 */
export function useOwnerCalendarLive(courtId: string | undefined, token?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!courtId) return;

    const socket = getRealtimeSocket(token ?? null);

    const subscribe = () => {
      socket.emit('subscribe:court', { courtId });
    };

    const onUpdated = (payload: LiveSlotUpdated) => {
      if (!payload?.id || payload.courtId !== courtId) return;

      let missed = false;
      queryClient.setQueriesData<CalendarResponse>(
        { queryKey: ['owner', 'calendar', courtId] },
        (current) => {
          const next = patchCalendar(current, payload);
          if (next === 'miss') {
            missed = true;
            return current;
          }
          return next;
        },
      );

      if (missed) {
        void queryClient.invalidateQueries({ queryKey: ['owner', 'calendar', courtId] });
      }
    };

    const onReleased = (payload: { slotId: string; courtId: string }) => {
      if (payload.courtId !== courtId) return;
      void queryClient.invalidateQueries({ queryKey: ['owner', 'calendar', courtId] });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
    };

    const onBookingConfirmed = (payload: { courtId: string }) => {
      if (payload.courtId !== courtId) return;
      void queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
    };

    subscribe();
    socket.on('connect', subscribe);
    socket.on('slot:updated', onUpdated);
    socket.on('slot:released', onReleased);
    socket.on('booking:confirmed', onBookingConfirmed);

    return () => {
      socket.emit('unsubscribe:court', { courtId });
      socket.off('connect', subscribe);
      socket.off('slot:updated', onUpdated);
      socket.off('slot:released', onReleased);
      socket.off('booking:confirmed', onBookingConfirmed);
    };
  }, [courtId, queryClient, token]);
}
