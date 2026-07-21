import type {
  CommunityAnnouncement,
  CommunityMatchSummary,
  CommunityMessage,
} from '@fitora/shared';
import type { Socket } from 'socket.io-client';
import { getRealtimeSocket } from './realtime';

export interface CommunityTypingPayload {
  groupId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface CommunityJoinRequestPayload {
  groupId: string;
  requestId: string;
  userName: string;
}

export function subscribeCommunityGroup(token: string | null | undefined, groupId: string): Socket {
  const socket = getRealtimeSocket(token);
  socket.emit('subscribe:community-group', { groupId });
  return socket;
}

export function unsubscribeCommunityGroup(token: string | null | undefined, groupId: string) {
  const socket = getRealtimeSocket(token);
  socket.emit('unsubscribe:community-group', { groupId });
}

export function emitCommunityTyping(
  token: string | null | undefined,
  groupId: string,
  isTyping: boolean,
) {
  const socket = getRealtimeSocket(token);
  socket.emit('community:typing', { groupId, isTyping });
}

export type CommunityRealtimeHandlers = {
  onMessage?: (message: CommunityMessage) => void;
  onTyping?: (payload: CommunityTypingPayload) => void;
  onMatchUpdated?: (match: CommunityMatchSummary) => void;
  onAnnouncement?: (announcement: CommunityAnnouncement) => void;
  onReaction?: (message: CommunityMessage) => void;
  onJoinRequest?: (payload: CommunityJoinRequestPayload) => void;
};

export function bindCommunityGroupListeners(
  token: string | null | undefined,
  handlers: CommunityRealtimeHandlers,
) {
  const socket = getRealtimeSocket(token);

  const messageHandler = (payload: CommunityMessage) => handlers.onMessage?.(payload);
  const typingHandler = (payload: CommunityTypingPayload) => handlers.onTyping?.(payload);
  const matchHandler = (payload: CommunityMatchSummary) => handlers.onMatchUpdated?.(payload);
  const announcementHandler = (payload: CommunityAnnouncement) =>
    handlers.onAnnouncement?.(payload);
  const reactionHandler = (payload: CommunityMessage) => handlers.onReaction?.(payload);
  const joinRequestHandler = (payload: CommunityJoinRequestPayload) =>
    handlers.onJoinRequest?.(payload);

  socket.on('community.message', messageHandler);
  socket.on('community.typing', typingHandler);
  socket.on('community.match.updated', matchHandler);
  socket.on('community.announcement', announcementHandler);
  socket.on('community.reaction', reactionHandler);
  socket.on('community.join_request', joinRequestHandler);

  return () => {
    socket.off('community.message', messageHandler);
    socket.off('community.typing', typingHandler);
    socket.off('community.match.updated', matchHandler);
    socket.off('community.announcement', announcementHandler);
    socket.off('community.reaction', reactionHandler);
    socket.off('community.join_request', joinRequestHandler);
  };
}
