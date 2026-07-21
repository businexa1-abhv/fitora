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
import { RealtimeOutboxService } from './realtime-outbox.service';
import { SlotEventsService, type SlotUpdatedPayload } from './slot-events.service';
import type { RealtimeEventEnvelope, SlotSnapshot } from './realtime.types';
import { LEGACY_EVENT_ALIASES } from './realtime.types';

type CourtSubscribePayload = {
  courtId: string;
  date?: string;
};

type VenueSubscribePayload = {
  venueId: string;
};

type TenantSubscribePayload = {
  tenantId: string;
};

function slotDateKey(startTime: Date | string): string {
  const value = typeof startTime === 'string' ? new Date(startTime) : startTime;
  return value.toISOString().slice(0, 10);
}

function courtRoom(courtId: string) {
  return `court:${courtId}`;
}

function courtDateRoom(courtId: string, date: string) {
  return `court:${courtId}:date:${date}`;
}

function venueRoom(venueId: string) {
  return `venue:${venueId}`;
}

function tenantRoom(tenantId: string) {
  return `tenant:${tenantId}`;
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

function adminRoom() {
  return 'role:admin';
}

function trainerRoom() {
  return 'role:trainer';
}

function toClientSlot(payload: SlotUpdatedPayload | SlotSnapshot) {
  return {
    ...payload,
    startTime:
      typeof payload.startTime === 'string' ? payload.startTime : payload.startTime.toISOString(),
    endTime: typeof payload.endTime === 'string' ? payload.endTime : payload.endTime.toISOString(),
  };
}

@Public()
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class SlotsGateway
  implements OnModuleInit, OnModuleDestroy, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SlotsGateway.name);
  private unsubscribeEvents: (() => void) | null = null;
  private unsubscribeOutbox: (() => void) | null = null;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly events: SlotEventsService,
    private readonly outbox: RealtimeOutboxService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.unsubscribeEvents = this.events.onEvent((event, payload) => {
      this.broadcast(event, payload);
    });
    // Crash-recovery path: republish pending outbox envelopes that never got markPublished.
    this.unsubscribeOutbox = this.outbox.onPublished((envelope) => {
      this.broadcastEnvelope(envelope);
    });
    this.logger.log('SlotsGateway listening for slot events');
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
      client.data.roles = auth.roles;
      void client.join(userRoom(auth.userId));
      if (auth.roles.includes('ADMIN')) {
        void client.join(adminRoom());
      }
      if (auth.roles.includes('COACH') || auth.roles.includes('TRAINER')) {
        void client.join(trainerRoom());
      }
    }
    this.logger.debug(`Client connected ${client.id}${auth?.userId ? ` user=${auth.userId}` : ''}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected ${client.id}`);
  }

  @SubscribeMessage('subscribe:court')
  handleSubscribeCourt(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CourtSubscribePayload,
  ) {
    if (!body?.courtId || typeof body.courtId !== 'string') {
      return { ok: false, error: 'courtId required' };
    }

    void client.join(courtRoom(body.courtId));
    if (body.date && typeof body.date === 'string') {
      void client.join(courtDateRoom(body.courtId, body.date));
    }

    return { ok: true, courtId: body.courtId, date: body.date ?? null };
  }

  @SubscribeMessage('unsubscribe:court')
  handleUnsubscribeCourt(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CourtSubscribePayload,
  ) {
    if (!body?.courtId || typeof body.courtId !== 'string') {
      return { ok: false, error: 'courtId required' };
    }

    void client.leave(courtRoom(body.courtId));
    if (body.date && typeof body.date === 'string') {
      void client.leave(courtDateRoom(body.courtId, body.date));
    }

    return { ok: true };
  }

  @SubscribeMessage('subscribe:venue')
  handleSubscribeVenue(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: VenueSubscribePayload,
  ) {
    if (!body?.venueId || typeof body.venueId !== 'string') {
      return { ok: false, error: 'venueId required' };
    }
    void client.join(venueRoom(body.venueId));
    return { ok: true, venueId: body.venueId };
  }

  @SubscribeMessage('unsubscribe:venue')
  handleUnsubscribeVenue(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: VenueSubscribePayload,
  ) {
    if (!body?.venueId || typeof body.venueId !== 'string') {
      return { ok: false, error: 'venueId required' };
    }
    void client.leave(venueRoom(body.venueId));
    return { ok: true };
  }

  @SubscribeMessage('subscribe:tenant')
  handleSubscribeTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TenantSubscribePayload,
  ) {
    if (!body?.tenantId || typeof body.tenantId !== 'string') {
      return { ok: false, error: 'tenantId required' };
    }
    const roles: string[] = client.data.roles ?? [];
    if (!roles.includes('ADMIN') && !roles.includes('COURT_OWNER') && !roles.includes('COACH')) {
      return { ok: false, error: 'forbidden' };
    }
    void client.join(tenantRoom(body.tenantId));
    return { ok: true, tenantId: body.tenantId };
  }

  private broadcastEnvelope(envelope: RealtimeEventEnvelope) {
    this.broadcast(envelope.event, envelope);
    const aliases = LEGACY_EVENT_ALIASES[envelope.event] ?? [];
    for (const alias of aliases) {
      this.broadcast(alias, envelope.data);
    }
  }

  private broadcast(event: string, payload: unknown) {
    if (!this.server) return;

    const emitAdmin = (name: string, data: unknown) => {
      this.server.to(adminRoom()).emit(name, data);
      this.server.to(trainerRoom()).emit(name, data);
    };

    const emitCourtRooms = (
      courtId: string,
      startTime: Date | string | undefined,
      name: string,
      data: unknown,
    ) => {
      this.server.to(courtRoom(courtId)).emit(name, data);
      if (startTime) {
        this.server.to(courtDateRoom(courtId, slotDateKey(startTime))).emit(name, data);
      }
    };

    // Canonical envelope form
    if (
      payload &&
      typeof payload === 'object' &&
      'event' in (payload as object) &&
      'data' in (payload as object)
    ) {
      const envelope = payload as RealtimeEventEnvelope;
      const data = envelope.data;
      const courtId = envelope.courtId ?? (data as { courtId?: string })?.courtId;
      const venueId = envelope.venueId ?? (data as { venueId?: string })?.venueId;
      const tenantId = envelope.tenantId ?? (data as { tenantId?: string })?.tenantId;
      const startTime = (data as { startTime?: Date | string })?.startTime;

      if (typeof courtId === 'string') {
        emitCourtRooms(courtId, startTime, event, data);
        // Also emit envelope for version-aware clients
        emitCourtRooms(courtId, startTime, envelope.event, envelope);
      }
      if (typeof venueId === 'string') {
        this.server.to(venueRoom(venueId)).emit(event, data);
        this.server.to(venueRoom(venueId)).emit(envelope.event, envelope);
      }
      if (typeof tenantId === 'string') {
        this.server.to(tenantRoom(tenantId)).emit(event, data);
      }
      emitAdmin(event, data);
      emitAdmin(envelope.event, envelope);
      return;
    }

    if (event === 'slot:updated' || event.startsWith('slot.')) {
      const slot = payload as SlotUpdatedPayload | SlotSnapshot;
      if (!slot?.courtId) return;
      const clientPayload = toClientSlot(slot);
      emitCourtRooms(slot.courtId, slot.startTime, event, clientPayload);
      if ('venueId' in slot && slot.venueId) {
        this.server.to(venueRoom(String(slot.venueId))).emit(event, clientPayload);
      }
      if ('tenantId' in slot && slot.tenantId) {
        this.server.to(tenantRoom(String(slot.tenantId))).emit(event, clientPayload);
      }
      emitAdmin(event, clientPayload);
      return;
    }

    if (event === 'slot:released') {
      const data = payload as { slotId: string; courtId: string; reason: string };
      this.server.to(courtRoom(data.courtId)).emit('slot:released', data);
      emitAdmin('slot:released', data);
      return;
    }

    if (
      event === 'booking:confirmed' ||
      event === 'booking.created' ||
      event === 'booking.confirmed'
    ) {
      const data = payload as {
        bookingId: string;
        userId: string;
        checkInCode?: string;
        slotId: string;
        courtId: string;
      };
      this.server.to(userRoom(data.userId)).emit(event, data);
      this.server.to(courtRoom(data.courtId)).emit(event, data);
      this.server.to(courtRoom(data.courtId)).emit('booking.created', data);
      emitAdmin('booking.created', data);
      emitAdmin('booking.confirmed', data);
      return;
    }

    if (event === 'booking:cancelled' || event === 'booking.cancelled') {
      const data = payload as {
        bookingId: string;
        userId: string;
        slotId: string;
        courtId: string;
        refundAmount: number;
      };
      this.server.to(userRoom(data.userId)).emit('booking.cancelled', data);
      this.server.to(courtRoom(data.courtId)).emit('booking.cancelled', data);
      emitAdmin('booking.cancelled', data);
      return;
    }

    if (event === 'attendance:updated' || event === 'attendance.updated') {
      const data = payload as {
        bookingId: string;
        userId: string;
        courtId: string;
        slotId: string;
        checkedInAt: Date | string;
      };
      this.server.to(userRoom(data.userId)).emit('attendance.updated', data);
      this.server.to(courtRoom(data.courtId)).emit('attendance.updated', data);
      emitAdmin('attendance.updated', data);
      return;
    }

    if (event === 'waitlist.promoted') {
      const data = payload as {
        waitlistEntryId: string;
        userId: string;
        slotId: string;
        courtId: string;
        seats: number;
      };
      this.server.to(userRoom(data.userId)).emit(event, data);
      this.server.to(courtRoom(data.courtId)).emit(event, data);
      emitAdmin(event, data);
      return;
    }

    if (event === 'membership.updated') {
      const data = payload as {
        membershipId: string;
        userId: string;
        courtId: string;
        status: string;
      };
      this.server.to(userRoom(data.userId)).emit(event, data);
      this.server.to(courtRoom(data.courtId)).emit(event, data);
      emitAdmin(event, data);
      return;
    }

    if (event === 'payment.updated') {
      const data = payload as {
        paymentId: string;
        userId: string;
        courtId?: string | null;
        status: string;
        amount?: number;
      };
      this.server.to(userRoom(data.userId)).emit(event, data);
      if (data.courtId) this.server.to(courtRoom(data.courtId)).emit(event, data);
      emitAdmin(event, data);
      return;
    }

    if (event === 'coach.updated') {
      const data = payload as { coachId: string; courtId?: string | null; action: string };
      this.server.to(userRoom(data.coachId)).emit(event, data);
      if (data.courtId) this.server.to(courtRoom(data.courtId)).emit(event, data);
      emitAdmin(event, data);
      return;
    }

    if (event === 'player.updated') {
      const data = payload as { userId: string; courtId?: string | null; action: string };
      this.server.to(userRoom(data.userId)).emit(event, data);
      if (data.courtId) this.server.to(courtRoom(data.courtId)).emit(event, data);
      emitAdmin(event, data);
      return;
    }

    this.logger.debug(`Unhandled realtime event: ${event}`);
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
