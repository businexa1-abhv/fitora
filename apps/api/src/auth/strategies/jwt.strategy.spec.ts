import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.module';

describe('JwtStrategy', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
  } as unknown as jest.Mocked<Pick<PrismaService, 'user'>>;

  const strategy = new JwtStrategy(
    { getOrThrow: () => 'test-secret' } as ConfigService,
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
});
