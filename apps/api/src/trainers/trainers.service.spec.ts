import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { TrainersService } from './trainers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';

describe('TrainersService', () => {
  let service: TrainersService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notificationsService: any;

  beforeEach(async () => {
    prisma = {
      trainerProfile: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: { findFirst: jest.fn() },
      trainingBatch: { findMany: jest.fn(), findFirst: jest.fn() },
      trainingEnrollment: { findMany: jest.fn(), findFirst: jest.fn() },
      attendanceRecord: { findMany: jest.fn(), groupBy: jest.fn() },
      progressReport: { count: jest.fn() },
      leaveRequest: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      trainingNote: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    notificationsService = {
      create: jest.fn(),
      notifyLeaveRequestUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(TrainersService);
  });

  describe('createLeaveRequest', () => {
    it('rejects end date before start date', async () => {
      await expect(
        service.createLeaveRequest('trainer-1', {
          startDate: '2026-07-10',
          endDate: '2026-07-08',
          reason: 'Family emergency',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates leave request when dates are valid', async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue(null);
      prisma.leaveRequest.create.mockResolvedValue({
        id: 'leave-1',
        trainerId: 'trainer-1',
        startDate: new Date('2026-07-10'),
        endDate: new Date('2026-07-12'),
        reason: 'Medical leave',
        status: LeaveRequestStatus.PENDING,
        reviewNote: null,
        reviewedById: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.trainingBatch.findMany.mockResolvedValue([]);

      const result = await service.createLeaveRequest('trainer-1', {
        startDate: '2026-07-10',
        endDate: '2026-07-12',
        reason: 'Medical leave',
      });

      expect(result.status).toBe(LeaveRequestStatus.PENDING);
      expect(prisma.leaveRequest.create).toHaveBeenCalled();
    });
  });

  describe('getOrCreateProfile', () => {
    it('creates profile when missing', async () => {
      prisma.trainerProfile.findFirst.mockResolvedValue(null);
      prisma.trainerProfile.create.mockResolvedValue({
        id: 'profile-1',
        userId: 'trainer-1',
        bio: null,
        certifications: null,
        yearsExperience: null,
        specializations: [],
        isVerified: false,
        averageRating: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.user.findFirst.mockResolvedValue({
        id: 'trainer-1',
        firstName: 'Coach',
        lastName: 'Ravi',
        email: 'trainer@fitora.com',
        phone: null,
      });

      const profile = await service.getOrCreateProfile('trainer-1');
      expect(profile.user?.firstName).toBe('Coach');
      expect(prisma.trainerProfile.create).toHaveBeenCalled();
    });
  });
});
