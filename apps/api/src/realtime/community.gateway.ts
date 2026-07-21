import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Public } from '../common/decorators';
import { CommunityEventsService, type CommunityRealtimeEvent } from './community-events.service';
import { RealtimeOutboxService } from './realtime-outbox.service';

type GroupSubscribePayload = { groupId: string };

function groupRoom(groupId: string) {
  return `community:group:${groupId}`;
}

function communityUserRoom(userId: string) {
  return `community:user:${userId}`;
}

@Public()
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class CommunityGateway
  implements OnModuleInit, OnModuleDestroy, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(CommunityGateway.name);
  private unsubscribeEvents: (() => void) | null = null;
  private unsubscribeOutbox: (() => void) | null = null;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly events: CommunityEventsService,
    private readonly outbox: RealtimeOutboxService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.unsubscribeEvents = this.events.onEvent((event, payload) => {
      this.broadcast(event, payload);
    });
    this.unsubscribeOutbox = this.outbox.onPublished((envelope) => {
      if (typeof envelope.event === 'string' && envelope.event.startsWith('community.')) {
        this.broadcast(envelope.event as CommunityRealtimeEvent, envelope.data);
      }
    });
    this.logger.log('CommunityGateway listening for community events');
  }

  onModuleDestroy() {
    this.unsubscribeEvents?.();
    this.unsubscribeEvents = null;
    this.unsubscribeOutbox?.();
    this.unsubscribeOutbox = null;
  }

  handleConnection(client: Socket) {
    const auth = this.tryAuthenticate(client);
    if (auth?.userId) {
      client.data.userId = auth.userId;
      void client.join(communityUserRoom(auth.userId));
    }
    this.logger.debug(`Community client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Community client disconnected ${client.id}`);
  }

  @SubscribeMessage('subscribe:community:group')
  handleSubscribeGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GroupSubscribePayload,
  ) {
    if (!body?.groupId || typeof body.groupId !== 'string') {
      return { ok: false, error: 'groupId required' };
    }
    void client.join(groupRoom(body.groupId));
    return { ok: true, groupId: body.groupId };
  }

  @SubscribeMessage('unsubscribe:community:group')
  handleUnsubscribeGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GroupSubscribePayload,
  ) {
    if (!body?.groupId || typeof body.groupId !== 'string') {
      return { ok: false, error: 'groupId required' };
    }
    void client.leave(groupRoom(body.groupId));
    return { ok: true };
  }

  @SubscribeMessage('community:typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() body: GroupSubscribePayload) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.groupId) return { ok: false };
    this.server
      .to(groupRoom(body.groupId))
      .emit('community.typing', { groupId: body.groupId, userId });
    return { ok: true };
  }

  private broadcast(event: CommunityRealtimeEvent, payload: unknown) {
    if (!this.server) return;
    const data = payload as { groupId?: string; userId?: string };
    if (data.groupId) {
      this.server.to(groupRoom(data.groupId)).emit(event, payload);
    }
    if (data.userId) {
      this.server.to(communityUserRoom(data.userId)).emit(event, payload);
    }
  }

  private tryAuthenticate(client: Socket): { userId: string; roles: string[] } | null {
    const authToken =
      (typeof client.handshake.auth?.token === 'string' && client.handshake.auth.token) ||
      this.bearerFromHeader(client.handshake.headers.authorization);

    if (!authToken) return null;

    try {
      const payload = this.jwtService.verify<{ sub?: string; roles?: string[] }>(authToken, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      if (!payload.sub) return null;
      return { userId: payload.sub, roles: payload.roles ?? [] };
    } catch {
      return null;
    }
  }

  private bearerFromHeader(header: string | string[] | undefined): string | null {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value?.startsWith('Bearer ')) return null;
    return value.slice('Bearer '.length).trim() || null;
  }
}
