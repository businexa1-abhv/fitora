import { Injectable, Logger } from '@nestjs/common';
import { RealtimeOutboxService } from './realtime-outbox.service';

export type CommunityRealtimeEvent =
  | 'community.message'
  | 'community.typing'
  | 'community.presence'
  | 'community.match.updated'
  | 'community.join_request'
  | 'community.announcement'
  | 'community.reaction';

export type CommunityEventPayload = {
  groupId?: string;
  userId?: string;
  [key: string]: unknown;
};

@Injectable()
export class CommunityEventsService {
  private readonly logger = new Logger(CommunityEventsService.name);
  private readonly listeners = new Set<(event: CommunityRealtimeEvent, payload: unknown) => void>();

  constructor(private readonly outbox: RealtimeOutboxService) {}

  onEvent(listener: (event: CommunityRealtimeEvent, payload: unknown) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitLocal(event: CommunityRealtimeEvent, payload: unknown) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (error) {
        this.logger.warn(`Community event listener failed: ${String(error)}`);
      }
    }
  }

  async emit(event: CommunityRealtimeEvent, payload: CommunityEventPayload) {
    try {
      await this.outbox.enqueue(event, payload);
    } catch (error) {
      this.logger.warn(`Community outbox enqueue failed: ${String(error)}`);
    }
    this.emitLocal(event, payload);
  }

  emitMessage(groupId: string, message: unknown) {
    return this.emit('community.message', { groupId, message });
  }

  emitMatchUpdated(groupId: string, match: unknown) {
    return this.emit('community.match.updated', { groupId, match });
  }

  emitJoinRequest(groupId: string, request: unknown) {
    return this.emit('community.join_request', { groupId, request });
  }

  emitAnnouncement(groupId: string, announcement: unknown) {
    return this.emit('community.announcement', { groupId, announcement });
  }

  emitReaction(groupId: string, messageId: string, reaction: unknown) {
    return this.emit('community.reaction', { groupId, messageId, reaction });
  }

  emitTyping(groupId: string, userId: string) {
    return this.emit('community.typing', { groupId, userId });
  }

  emitPresence(userId: string, status: string) {
    return this.emit('community.presence', { userId, status });
  }
}
