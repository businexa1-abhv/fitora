import { createHmac } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { IntegrationProvider } from '@prisma/client';
import {
  type IntegrationAdapter,
  type NormalizedWebhookEvent,
  type OutboundSyncRequest,
} from './integration-adapter';

@Injectable()
export class HttpIntegrationAdapter implements IntegrationAdapter {
  readonly provider: IntegrationProvider = IntegrationProvider.GENERIC;

  normalizeWebhook(payload: unknown): NormalizedWebhookEvent {
    if (!payload || typeof payload !== 'object')
      throw new BadRequestException('Invalid webhook body');
    const event = payload as Record<string, unknown>;
    const eventId = String(event.eventId ?? '');
    const type = String(event.type ?? '') as NormalizedWebhookEvent['type'];
    if (
      !eventId ||
      !['booking.created', 'booking.cancelled', 'slot.hold', 'slot.release'].includes(type)
    ) {
      throw new BadRequestException('Webhook requires eventId and a supported normalized type');
    }
    return {
      eventId,
      type,
      occurredAt: String(event.occurredAt ?? new Date().toISOString()),
      data:
        event.data && typeof event.data === 'object' ? (event.data as Record<string, unknown>) : {},
    };
  }

  async send(request: OutboundSyncRequest) {
    const body = JSON.stringify(request.payload);
    const signature = createHmac('sha256', request.webhookSecret).update(body).digest('hex');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const started = Date.now();
    try {
      const response = await fetch(request.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-fitora-idempotency-key': request.idempotencyKey,
          'x-fitora-signature': signature,
        },
        body,
      });
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
      return { status: response.status, latencyMs: Date.now() - started };
    } finally {
      clearTimeout(timeout);
    }
  }
}

@Injectable()
export class PlayoAdapter extends HttpIntegrationAdapter {
  override readonly provider = IntegrationProvider.PLAYO;
}

@Injectable()
export class PlayArenaAdapter extends HttpIntegrationAdapter {
  override readonly provider = IntegrationProvider.PLAYARENA;
}
