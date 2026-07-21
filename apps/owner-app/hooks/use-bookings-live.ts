import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';

/**
 * Subscribes to the tenant Socket.IO room and invalidates all booking
 * query cache entries when booking lifecycle events arrive.
 *
 * Mount this once in BookingsTabScreen. Child screens share the same
 * React Query cache and re-render automatically.
 */
export function useBookingsLive(tenantId: string | undefined, token?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const socket = getRealtimeSocket(token ?? null);

    const invalidateAll = () => {
      void queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
    };

    const invalidateOne = (payload: { bookingId?: string; id?: string }) => {
      const id = payload.bookingId ?? payload.id;
      if (id) void queryClient.invalidateQueries({ queryKey: ['owner', 'booking', id] });
      invalidateAll();
    };

    const onConnect = () => {
      socket.emit('subscribe:tenant', { tenantId });
      invalidateAll();
    };

    socket.emit('subscribe:tenant', { tenantId });
    socket.on('connect', onConnect);
    socket.on('booking.confirmed', invalidateOne);
    socket.on('booking:confirmed', invalidateOne);
    socket.on('booking.cancelled', invalidateOne);
    socket.on('booking:cancelled', invalidateOne);
    socket.on('attendance.updated', invalidateOne);
    socket.on('booking.created', invalidateAll);

    return () => {
      socket.emit('unsubscribe:tenant', { tenantId });
      socket.off('connect', onConnect);
      socket.off('booking.confirmed', invalidateOne);
      socket.off('booking:confirmed', invalidateOne);
      socket.off('booking.cancelled', invalidateOne);
      socket.off('booking:cancelled', invalidateOne);
      socket.off('attendance.updated', invalidateOne);
      socket.off('booking.created', invalidateAll);
    };
  }, [tenantId, token, queryClient]);
}
