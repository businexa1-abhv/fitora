import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { PrismaService } from '../../prisma/prisma.module';

jest.mock('bcryptjs');

describe('PasswordService', () => {
  let service: PasswordService;
  let prisma: jest.Mocked<
    Pick<PrismaService, 'user' | 'passwordResetToken' | '$transaction'>
  >;
  let tokenService: jest.Mocked<Pick<TokenService, 'revokeAllUserTokens'>>;

  beforeEach(async () => {
    prisma = {
      user: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      passwordResetToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<PrismaService, 'user' | 'passwordResetToken' | '$transaction'>
    >;

    tokenService = { revokeAllUserTokens: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultValue?: string) => defaultValue ?? 'mock'),
          },
        },
      ],
    }).compile();

    service = module.get(PasswordService);
  });

  it('returns generic message for forgot password regardless of user existence', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const result = await service.requestReset('unknown@example.com');

    expect(result.message).toContain('If an account exists');
  });

  it('changePassword updates hash when current password valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: 'old-hash',
    } as never);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    prisma.user.update.mockResolvedValue({} as never);

    const result = await service.changePassword('u1', 'OldPass123!', 'NewPass123!');
    expect(result.message).toContain('Password');
    expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('u1');
  });

  it('resetPassword succeeds with valid token', async () => {
    prisma.passwordResetToken.findMany.mockResolvedValue([
      {
        id: 'tok-1',
        userId: 'u1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
        user: { id: 'u1', isActive: true, deletedAt: null },
      },
    ] as never);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    prisma.$transaction.mockResolvedValue([]);

    const result = await service.resetPassword('valid-token', 'NewPass123!');
    expect(result.message).toContain('Password');
  });
});
