import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { TokenService } from './token.service';
import { PrismaService } from '../../prisma/prisma.module';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('TokenService', () => {
  let service: TokenService;
  let prisma: jest.Mocked<Pick<PrismaService, 'refreshToken'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  beforeEach(async () => {
    prisma = {
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    } as unknown as jest.Mocked<Pick<PrismaService, 'refreshToken'>>;

    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'secret';
              if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
              return undefined;
            }),
            get: jest.fn((_key: string, defaultValue?: string) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get(TokenService);
  });

  it('issues access and refresh tokens', async () => {
    prisma.refreshToken.create.mockResolvedValue({} as never);

    const tokens = await service.issueTokenPair('user-1', 'test@example.com');

    expect(tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          token: hashToken('refresh-token'),
        }),
      }),
    );
  });

  it('rejects expired refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      token: hashToken('old-token'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      createdAt: new Date(),
      user: {
        id: 'user-1',
        email: 'test@example.com',
        isActive: true,
        deletedAt: null,
        roles: [],
      },
    } as never);

    await expect(service.rotateRefreshToken('old-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
