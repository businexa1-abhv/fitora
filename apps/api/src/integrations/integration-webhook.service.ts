import { createHash, createHmac, timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { IntegrationConflictType, IntegrationProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { AdapterRegistry } from './adapters/adapter-registry.service';
import { IntegrationCryptoService } from './integration-crypto.service';
import { ChannelAvailabilityService } from './channel-availability.service';

@Injectable()
export class IntegrationWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: AdapterRegistry,
    private readonly crypto: IntegrationCryptoService,
    private readonly channel: ChannelAvailabilityService,
  ) {}

  async handle(
    providerParam: string,
    integrationId: string | undefined,
    signature: string | undefined,
    rawBody: string,
  ) {
    const provider = providerParam.toUpperCase() as IntegrationProvider;
    if (!Object.values(IntegrationProvider).includes(provider)) {
      throw new NotFoundException('Integration provider not found');
    }
    if (!integrationId) throw new BadRequestException('Missing x-fitora-integration-id');
    const connection = await this.prisma.integrationConnection.findFirst({
      where: { id: integrationId, provider },
    });
    if (!connection) throw new NotFoundException('Integration not found');

    const secret = this.crypto.decrypt<string>(connection.webhookSecretEncrypted);
    try {
      this.verifySignature(secret, signature, rawBody);
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.integrationConnection.update({
          where: { id: connection.id },
          data: { failedWebhookCount: { increment: 1 } },
        }),
        this.prisma.integrationConflict.create({
          data: {
            tenantId: connection.tenantId,
            integrationId: connection.id,
            type: IntegrationConflictType.WEBHOOK_REJECTED,
            details: { reason: 'invalid_signature' },
          },
        }),
      ]);
      throw error;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Invalid webhook JSON');
    }
    const event = this.adapters.get(provider).normalizeWebhook(payload);
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    try {
      await this.prisma.integrationWebhookEvent.create({
        data: {
          integrationId: connection.id,
          provider,
          externalEventId: event.eventId,
          eventType: event.type,
          payloadHash,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { accepted: true, duplicate: true, eventId: event.eventId };
      }
      throw error;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: connection.tenantId },
      select: { ownerId: true },
    });
    if (!tenant) throw new NotFoundException('Integration tenant not found');
    const identity = {
      id: connection.id,
      tenantId: connection.tenantId,
      provider: connection.provider,
      ownerId: tenant.ownerId,
    };
    try {
      const data = event.data;
      if (event.type === 'booking.created') {
        await this.channel.createBooking(identity, {
          courtId: this.string(data.courtId),
          slotId: this.string(data.slotId),
          idempotencyKey: this.string(data.idempotencyKey, event.eventId),
          externalBookingId: this.string(data.externalBookingId),
          seats: this.optionalNumber(data.seats),
        });
      } else if (event.type === 'booking.cancelled') {
        await this.channel.cancelBooking(identity, {
          bookingId: this.optionalString(data.bookingId),
          externalBookingId: this.optionalString(data.externalBookingId),
          reason: this.optionalString(data.reason),
        });
      } else if (event.type === 'slot.hold') {
        await this.channel.hold(identity, {
          courtId: this.string(data.courtId),
          slotId: this.string(data.slotId),
          idempotencyKey: this.string(data.idempotencyKey, event.eventId),
          externalBookingId: this.optionalString(data.externalBookingId),
          seats: this.optionalNumber(data.seats),
        });
      } else {
        await this.channel.release(identity, {
          bookingId: this.optionalString(data.bookingId),
          idempotencyKey: this.optionalString(data.idempotencyKey),
        });
      }
      await this.prisma.integrationWebhookEvent.update({
        where: {
          integrationId_externalEventId: {
            integrationId: connection.id,
            externalEventId: event.eventId,
          },
        },
        data: { processedAt: new Date() },
      });
      return { accepted: true, duplicate: false, eventId: event.eventId };
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.integrationWebhookEvent.update({
          where: {
            integrationId_externalEventId: {
              integrationId: connection.id,
              externalEventId: event.eventId,
            },
          },
          data: { error: error instanceof Error ? error.message : 'Webhook processing failed' },
        }),
        this.prisma.integrationConnection.update({
          where: { id: connection.id },
          data: { failedWebhookCount: { increment: 1 } },
        }),
      ]);
      throw error;
    }
  }

  private verifySignature(secret: string, signature: string | undefined, body: string) {
    if (!signature) throw new UnauthorizedException('Missing webhook signature');
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    const actualBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private string(value: unknown, fallback?: string) {
    if (typeof value === 'string' && value) return value;
    if (fallback) return fallback;
    throw new BadRequestException('Webhook data is missing a required string field');
  }

  private optionalString(value: unknown) {
    return typeof value === 'string' && value ? value : undefined;
  }

  private optionalNumber(value: unknown) {
    return typeof value === 'number' ? value : undefined;
  }
}
