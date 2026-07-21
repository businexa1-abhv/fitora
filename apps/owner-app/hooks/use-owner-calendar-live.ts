import { useEffect, useRef } from 'react';
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
  const maintenanceSlots = day.slots.filter((s) => s.availabilityStatus === 'MAINTENANCE').length;
  const capacity = day.slots.reduce((sum, s) => sum + (s.capacity ?? 1), 0);
  const occupied = day.slots.reduce(
    (sum, s) => sum + (s.confirmedSeats ?? 0) + (s.reservedSeats ?? 0),
    0,
  );
  return {
    ...day,
    totalSlots: day.slots.length,
    bookedSlots,
    blockedSlots,
    availableSlots,
    maintenanceSlots,
    occupancyPercent: capacity === 0 ? 0 : Math.round((occupied / capacity) * 100),
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
 * Live-patches TanStack `['owner','calendar', courtId, …]` from Socket.IO slot events.
 */
export function useOwnerCalendarLive(courtId: string | undefined, token?: string | null) {
  const queryClient = useQueryClient();
  const versions = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!courtId) return;

    const socket = getRealtimeSocket(token ?? null);

    const subscribe = () => {
      socket.emit('subscribe:court', { courtId });
    };

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['owner', 'calendar', courtId] });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
    };

    const onUpdated = (payload: LiveSlotUpdated) => {
      if (!payload?.id || payload.courtId !== courtId) return;

      const known = versions.current.get(payload.id) ?? 0;
      if (payload.version != null && payload.version < known) return;
      if (payload.version != null) versions.current.set(payload.id, payload.version);

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

      if (missed) invalidate();
    };

    const onDeleted = (
      payload: LiveSlotUpdated | { id?: string; slotId?: string; courtId: string },
    ) => {
      const slotId =
        'id' in payload && payload.id ? payload.id : (payload as { slotId?: string }).slotId;
      if (!slotId || payload.courtId !== courtId) return;
      queryClient.setQueriesData<CalendarResponse>(
        { queryKey: ['owner', 'calendar', courtId] },
        (current) => {
          if (!current?.days) return current;
          const days = current.days.map((day) =>
            recountDay({ ...day, slots: day.slots.filter((s) => s.id !== slotId) }),
          );
          return { ...current, days };
        },
      );
      versions.current.delete(slotId);
    };

    const onReleased = (payload: { slotId: string; courtId: string }) => {
      if (payload.courtId !== courtId) return;
      invalidate();
    };

    const onBookingConfirmed = (payload: { courtId: string }) => {
      if (payload.courtId !== courtId) return;
      void queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
    };

    const onConnect = () => {
      subscribe();
      invalidate();
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
    socket.on('booking:confirmed', onBookingConfirmed);
    socket.on('booking.confirmed', onBookingConfirmed);

    return () => {
      socket.emit('unsubscribe:court', { courtId });
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
      socket.off('booking:confirmed', onBookingConfirmed);
      socket.off('booking.confirmed', onBookingConfirmed);
    };
  }, [courtId, queryClient, token]);
}
