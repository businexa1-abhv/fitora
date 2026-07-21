import { IntegrationProvider } from '@prisma/client';

export type NormalizedWebhookEvent = {
  eventId: string;
  type: 'booking.created' | 'booking.cancelled' | 'slot.hold' | 'slot.release';
  occurredAt: string;
  data: Record<string, unknown>;
};

export type OutboundSyncRequest = {
  endpoint: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  webhookSecret: string;
};

export interface IntegrationAdapter {
  readonly provider: IntegrationProvider;
  normalizeWebhook(payload: unknown): NormalizedWebhookEvent;
  send(request: OutboundSyncRequest): Promise<{ status: number; latencyMs: number }>;
}
