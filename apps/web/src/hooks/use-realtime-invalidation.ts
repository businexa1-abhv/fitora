'use client';

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';

const DEFAULT_EVENTS = [
  'attendance.updated',
  'booking.created',
  'booking.cancelled',
  'slot:updated',
  'membership.updated',
  'payment.updated',
  'coach.updated',
  'player.updated',
] as const;

/**
 * Live-invalidates TanStack queries when Socket.IO events fire for one or more courts.
 */
export function useRealtimeInvalidation(
  courtIds: string | string[] | undefined,
  token?: string | null,
  queryKeys: string[][] = [['trainer'], ['owner', 'dashboard'], ['owner', 'bookings']],
) {
  const queryClient = useQueryClient();
  const ids = useMemo(() => {
    if (!courtIds) return [] as string[];
    return (Array.isArray(courtIds) ? courtIds : [courtIds]).filter(Boolean);
  }, [courtIds]);
  const keysKey = useMemo(() => JSON.stringify(queryKeys), [queryKeys]);

  useEffect(() => {
    if (!ids.length || typeof window === 'undefined') return;

    const socket = getRealtimeSocket(token ?? null);
    const parsedKeys = JSON.parse(keysKey) as string[][];

    const subscribe = () => {
      for (const courtId of ids) {
        socket.emit('subscribe:court', { courtId });
      }
    };

    const invalidate = () => {
      for (const key of parsedKeys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    };

    subscribe();
    socket.on('connect', subscribe);
    for (const event of DEFAULT_EVENTS) {
      socket.on(event, invalidate);
    }

    return () => {
      for (const courtId of ids) {
        socket.emit('unsubscribe:court', { courtId });
      }
      socket.off('connect', subscribe);
      for (const event of DEFAULT_EVENTS) {
        socket.off(event, invalidate);
      }
    };
  }, [ids, keysKey, queryClient, token]);
}
