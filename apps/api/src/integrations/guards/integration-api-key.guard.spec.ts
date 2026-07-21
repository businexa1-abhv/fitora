import { UnauthorizedException } from '@nestjs/common';
import { IntegrationStatus, UserRole } from '@prisma/client';
import { IntegrationApiKeyGuard } from './integration-api-key.guard';

describe('IntegrationApiKeyGuard', () => {
  const prisma = {
    integrationConnection: { findFirst: jest.fn() },
    tenant: { findUnique: jest.fn() },
  };
  const crypto = { hashApiKey: jest.fn((value: string) => `hash:${value}`) };

  beforeEach(() => jest.clearAllMocks());

  it('authenticates a hashed active API key without retaining the raw key', async () => {
    prisma.integrationConnection.findFirst.mockResolvedValue({
      id: 'integration-id',
      tenantId: 'tenant-id',
      provider: 'PLAYO',
    });
    prisma.tenant.findUnique.mockResolvedValue({ ownerId: 'owner-id' });
    const request = { headers: { 'x-fitora-api-key': 'secret' } } as Record<string, unknown>;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const guard = new IntegrationApiKeyGuard(prisma as never, crypto as never);

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(prisma.integrationConnection.findFirst).toHaveBeenCalledWith({
      where: { apiKeyHash: 'hash:secret', status: IntegrationStatus.ACTIVE },
    });
    expect(request).toMatchObject({
      integration: { id: 'integration-id', ownerId: 'owner-id' },
      user: { id: 'owner-id', roles: [UserRole.COURT_OWNER] },
    });
  });

  it('rejects a missing API key', async () => {
    const guard = new IntegrationApiKeyGuard(prisma as never, crypto as never);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    };
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
