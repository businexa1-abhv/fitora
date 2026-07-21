import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';

/** Subscribe to venue room and invalidate venue/court queries on live updates. */
export function useVenueLive(venueId: string | undefined, token?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!venueId) return;

    const socket = getRealtimeSocket(token ?? null);

    const subscribe = () => {
      socket.emit('subscribe:venue', { venueId });
    };

    const reconcile = () => {
      void queryClient.invalidateQueries({ queryKey: ['venue', venueId] });
      void queryClient.invalidateQueries({ queryKey: ['venues'] });
    };

    const onVenueUpdated = (
      raw: { venueId?: string } | { event: string; data: { venueId?: string } },
    ) => {
      const payload =
        raw && typeof raw === 'object' && 'data' in raw && raw.data
          ? (raw.data as { venueId?: string })
          : (raw as { venueId?: string });
      if (payload?.venueId && payload.venueId !== venueId) return;
      reconcile();
    };

    const onCourtUpdated = (
      raw: { tenantId?: string } | { event: string; data: { tenantId?: string } },
    ) => {
      const payload =
        raw && typeof raw === 'object' && 'data' in raw && raw.data
          ? (raw.data as { tenantId?: string })
          : (raw as { tenantId?: string });
      if (payload?.tenantId && payload.tenantId !== venueId) return;
      reconcile();
    };

    subscribe();
    socket.on('connect', subscribe);
    socket.on('venue.updated', onVenueUpdated);
    socket.on('court.updated', onCourtUpdated);

    return () => {
      socket.emit('unsubscribe:venue', { venueId });
      socket.off('connect', subscribe);
      socket.off('venue.updated', onVenueUpdated);
      socket.off('court.updated', onCourtUpdated);
    };
  }, [venueId, token, queryClient]);
}
