import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { IntegrationProvider, Prisma } from '@prisma/client';
import { IntegrationWebhookService } from './integration-webhook.service';

describe('IntegrationWebhookService', () => {
  const connection = {
    id: 'integration-id',
    tenantId: 'tenant-id',
    provider: IntegrationProvider.PLAYO,
    webhookSecretEncrypted: 'encrypted',
  };
  const prisma = {
    integrationConnection: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    integrationWebhookEvent: { create: jest.fn() },
    integrationConflict: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const adapter = {
    normalizeWebhook: jest.fn(() => ({
      eventId: 'event-1',
      type: 'slot.hold',
      occurredAt: new Date().toISOString(),
      data: {},
    })),
  };
  const adapters = { get: jest.fn(() => adapter) };
  const crypto = { decrypt: jest.fn(() => 'webhook-secret') };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.integrationConnection.findFirst.mockResolvedValue(connection);
  });

  it('rejects an invalid provider HMAC', async () => {
    const service = new IntegrationWebhookService(
      prisma as never,
      adapters as never,
      crypto as never,
      {} as never,
    );
    await expect(
      service.handle('playo', connection.id, 'invalid', '{"eventId":"event-1"}'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a duplicate event ID without reprocessing', async () => {
    prisma.integrationWebhookEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    const body = JSON.stringify({ eventId: 'event-1', type: 'slot.hold', data: {} });
    const signature = createHmac('sha256', 'webhook-secret').update(body).digest('hex');
    const service = new IntegrationWebhookService(
      prisma as never,
      adapters as never,
      crypto as never,
      {} as never,
    );

    await expect(service.handle('playo', connection.id, signature, body)).resolves.toEqual({
      accepted: true,
      duplicate: true,
      eventId: 'event-1',
    });
  });
});
