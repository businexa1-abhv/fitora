import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { getMyCourts } from '@/lib/owner-api';

/** Resolve courtId from query param or first owned court. */
export function useDefaultCourt() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ courtId?: string | string[] }>();
  const raw = params.courtId;
  const paramId = Array.isArray(raw) ? raw[0] : raw;

  const courtsQuery = useQuery({
    queryKey: ['owner', 'courts'],
    queryFn: () => getMyCourts(token!),
    enabled: !!token,
  });

  const courts = courtsQuery.data?.items ?? [];
  const courtId = useMemo(() => paramId || courts[0]?.id, [paramId, courts]);
  const court = courts.find((c) => c.id === courtId) ?? courts[0];

  return { courtId, court, courts, courtsQuery, token };
}
