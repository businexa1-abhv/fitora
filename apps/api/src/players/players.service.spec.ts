import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlayersService } from './players.service';
import { PrismaService } from '../prisma/prisma.module';

describe('PlayersService', () => {
  let service: PlayersService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      userRoleAssignment: { create: jest.fn() },
      playerProfile: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      sport: { count: jest.fn() },
      playerFavoriteSport: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(async (ops: unknown[]) => ops),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PlayersService);
  });

  it('rejects profile upsert without terms', async () => {
    await expect(
      service.upsertProfile('user-1', {
        firstName: 'A',
        lastName: 'B',
        city: 'Bengaluru',
        agreeTerms: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upserts profile and marks onboarding complete when sports provided', async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'u@users.fitora.app',
        roles: [{ role: UserRole.PLAYER }],
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'u@users.fitora.app',
        phone: '+919876543210',
        firstName: 'Rahul',
        lastName: 'Sharma',
        avatarUrl: null,
        playerProfile: {
          gender: 'MALE',
          dateOfBirth: null,
          city: 'Bengaluru',
          skillLevel: 'BEGINNER',
          locationLabel: null,
          latitude: null,
          longitude: null,
          termsAcceptedAt: new Date(),
          notificationsOptInAt: null,
          onboardingCompletedAt: new Date(),
          favoriteSports: [],
        },
      });
    prisma.sport.count.mockResolvedValue(1);
    prisma.user.update.mockResolvedValue({});
    prisma.playerProfile.upsert.mockResolvedValue({ id: 'profile-1' });
    prisma.playerProfile.update.mockResolvedValue({});

    const result = await service.upsertProfile('user-1', {
      firstName: 'Rahul',
      lastName: 'Sharma',
      city: 'Bengaluru',
      agreeTerms: true,
      favoriteSportIds: ['sport-1'],
    });

    expect(prisma.playerProfile.upsert).toHaveBeenCalled();
    expect(result.firstName).toBe('Rahul');
  });
});