import { IntegrationProvider, IntegrationSyncJobStatus } from '@prisma/client';
import { IntegrationSyncService } from './integration-sync.service';

describe('IntegrationSyncService retries', () => {
  it('persists exponential retry state after an outbound failure', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      integrationSyncJob: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'job-id',
          integrationId: 'integration-id',
          idempotencyKey: 'key',
          payload: {},
          attempts: 1,
          maxAttempts: 8,
        }),
        update,
      },
      integrationConnection: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'integration-id',
          status: 'ACTIVE',
          provider: IntegrationProvider.GENERIC,
          outboundEndpoint: 'https://example.test/sync',
          credentialsEncrypted: null,
          webhookSecretEncrypted: 'secret',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const adapter = { send: jest.fn().mockRejectedValue(new Error('provider unavailable')) };
    const service = new IntegrationSyncService(
      prisma as never,
      {} as never,
      { get: () => adapter } as never,
      { decrypt: () => 'secret' } as never,
    );

    await expect(service.process('job-id')).rejects.toThrow('provider unavailable');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-id' },
      data: expect.objectContaining({
        attempts: 2,
        status: IntegrationSyncJobStatus.RETRYING,
        lastError: 'provider unavailable',
      }),
    });
  });
});
