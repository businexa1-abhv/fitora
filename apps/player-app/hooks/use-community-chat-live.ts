import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CommunityMessage } from '@fitora/shared';
import {
  bindCommunityGroupListeners,
  subscribeCommunityGroup,
  unsubscribeCommunityGroup,
} from '@/lib/community-realtime';

function upsertMessage(
  messages: CommunityMessage[],
  incoming: CommunityMessage,
): CommunityMessage[] {
  const index = messages.findIndex((m) => m.id === incoming.id);
  if (index === -1) {
    return [...messages, incoming].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
  const next = messages.slice();
  next[index] = incoming;
  return next;
}

/**
 * Subscribes to community group room and patches TanStack `['community', 'messages', groupId]`.
 */
export function useCommunityChatLive(groupId: string | undefined, token?: string | null) {
  const queryClient = useQueryClient();
  const groupRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!groupId) return;

    groupRef.current = groupId;
    subscribeCommunityGroup(token ?? null, groupId);

    const unbind = bindCommunityGroupListeners(token ?? null, {
      onMessage: (message) => {
        if (message.groupId !== groupId) return;
        queryClient.setQueryData<CommunityMessage[]>(
          ['community', 'messages', groupId],
          (current) => {
            if (!current) {
              void queryClient.invalidateQueries({ queryKey: ['community', 'messages', groupId] });
              return current;
            }
            return upsertMessage(current, message);
          },
        );
      },
      onReaction: (message) => {
        if (message.groupId !== groupId) return;
        queryClient.setQueryData<CommunityMessage[]>(
          ['community', 'messages', groupId],
          (current) => {
            if (!current) return current;
            return upsertMessage(current, message);
          },
        );
      },
    });

    return () => {
      unbind();
      unsubscribeCommunityGroup(token ?? null, groupId);
    };
  }, [groupId, queryClient, token]);
}
