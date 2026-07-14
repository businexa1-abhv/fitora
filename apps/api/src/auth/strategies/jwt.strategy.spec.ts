import { UnauthorizedException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import { type PrismaService } from '../../prisma/prisma.module';

interface MockPrisma {
  user: { findFirst: jest.Mock };
  userSession: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
}

describe('JwtStrategy', () => {
  const prisma: MockPrisma = {
    user: { findFirst: jest.fn() },
    userSession: { findFirst: jest.fn(), update: jest.fn() },
  };

  const strategy = new JwtStrategy(
    { getOrThrow: () => 'test-secret' } as unknown as ConfigService,
    prisma as unknown as PrismaService,
  );

  it('validate returns user payload with permissions', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'u@f.com',
      firstName: 'U',
      lastName: 'Ser',
      phone: null,
      avatarUrl: null,
      emailVerified: true,
      phoneVerified: false,
      roles: [{ role: UserRole.PLAYER }],
    } as never);

    const result = await strategy.validate({ sub: 'u1', email: 'u@f.com' });
    expect(result.id).toBe('u1');
    expect(result.roles).toContain(UserRole.PLAYER);
    expect(result.permissions.length).toBeGreaterThan(0);
  });

  it('validate throws for missing user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'x', email: 'x@f.com' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('validate checks active session for session-bound tokens', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'u@f.com',
      firstName: 'U',
      lastName: 'Ser',
      phone: null,
      avatarUrl: null,
      emailVerified: true,
      phoneVerified: false,
      roles: [{ role: UserRole.PLAYER }],
    });
    prisma.userSession.findFirst.mockResolvedValue({
      id: 's1',
      accessTokenVersion: 2,
    });
    prisma.userSession.update.mockResolvedValue({});

    const result = await strategy.validate({
      sub: 'u1',
      userId: 'u1',
      email: 'u@f.com',
      sessionId: 's1',
      deviceId: 'd1',
      tokenVersion: 2,
    });

    expect(result.sessionId).toBe('s1');
    expect(prisma.userSession.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { lastActive: expect.any(Date) },
    });
  });
});
