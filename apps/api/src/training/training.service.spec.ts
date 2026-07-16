import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import { TrainingService } from './training.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { SlotEventsService } from '../realtime/slot-events.service';
import { calculateAge } from './constants/age-groups';

describe('TrainingService', () => {
  let service: TrainingService;
  let prisma: jest.Mocked<
    Pick<
      PrismaService,
      | 'court'
      | 'sport'
      | 'trainingProgram'
      | 'trainingBatch'
      | 'trainingEnrollment'
      | 'kidProfile'
      | 'user'
      | 'attendanceRecord'
      | 'progressReport'
    >
  >;
  let paymentsService: jest.Mocked<Pick<PaymentsService, 'createPaymentOrder'>>;
  let notificationsService: jest.Mocked<
    Pick<
      NotificationsService,
      'notifyTrainingEnrolled' | 'notifyProgressReport' | 'notifyTrainerNewEnrollment'
    >
  >;

  const ownerUser = { id: 'owner-1', email: 'o@f.com', roles: [UserRole.COURT_OWNER] };

  beforeEach(async () => {
    prisma = {
      court: { findUnique: jest.fn() },
      sport: { findFirst: jest.fn() },
      trainingProgram: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      trainingBatch: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      trainingEnrollment: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      kidProfile: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      user: { findFirst: jest.fn(), findMany: jest.fn() },
      attendanceRecord: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      progressReport: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as typeof prisma;

    paymentsService = {
      createPaymentOrder: jest.fn().mockResolvedValue({ paymentId: 'pay-1' }),
    };

    notificationsService = {
      notifyTrainingEnrolled: jest.fn(),
      notifyProgressReport: jest.fn(),
      notifyTrainerNewEnrollment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: SlotEventsService, useValue: { emitCoachUpdated: jest.fn() } },
      ],
    }).compile();

    service = module.get(TrainingService);
  });

  describe('createProgram', () => {
    it('resolves sportId and creates program', async () => {
      prisma.court.findUnique.mockResolvedValue({ id: 'court-1', ownerId: 'owner-1' } as never);
      prisma.sport.findFirst.mockResolvedValue({ id: 'sport-1', slug: 'badminton' } as never);
      prisma.trainingProgram.create.mockResolvedValue({
        id: 'prog-1',
        courtId: 'court-1',
        sportId: 'sport-1',
        name: 'Juniors',
        minAge: 9,
        maxAge: 12,
        fee: '2000',
        isActive: true,
        description: null,
        court: { id: 'court-1', name: 'Arena', city: 'BLR' },
        sport: { id: 'sport-1', name: 'Badminton', slug: 'badminton' },
        batches: [],
      } as never);

      const result = await service.createProgram(
        'court-1',
        {
          name: 'Juniors',
          sportType: 'BADMINTON',
          minAge: 9,
          maxAge: 12,
          fee: 2000,
        },
        ownerUser,
      );

      expect(result.name).toBe('Juniors');
      expect(result.ageGroupLabel).toBe('Juniors');
    });
  });

  describe('enroll', () => {
    it('creates enrollment with amountPaid and payment order', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 10);

      prisma.kidProfile.findFirst.mockResolvedValue({
        id: 'kid-1',
        parentId: 'parent-1',
        dateOfBirth: dob,
      } as never);

      prisma.trainingBatch.findFirst.mockResolvedValue({
        id: 'batch-1',
        isActive: true,
        maxCapacity: 20,
        program: { isActive: true, minAge: 6, maxAge: 16, fee: '2500' },
        _count: { enrollments: 5 },
      } as never);

      prisma.trainingEnrollment.findUnique.mockResolvedValue(null);
      prisma.trainingEnrollment.create.mockResolvedValue({
        id: 'enroll-1',
        kidId: 'kid-1',
        batchId: 'batch-1',
        amountPaid: '2500',
        status: EnrollmentStatus.PENDING,
        kid: { firstName: 'A', lastName: 'B', dateOfBirth: dob, parentId: 'parent-1' },
        batch: {
          name: 'Morning',
          schedule: 'Mon Wed',
          program: { name: 'Juniors', court: { name: 'Arena' }, sport: { slug: 'badminton' } },
          trainer: { id: 't1', firstName: 'Coach', lastName: 'X', email: 'c@f.com' },
        },
      } as never);

      await service.enroll({ kidId: 'kid-1', batchId: 'batch-1' }, 'parent-1');

      expect(paymentsService.createPaymentOrder).toHaveBeenCalledWith(
        'parent-1',
        2500,
        'TRAINING',
        'enroll-1',
      );
    });

    it('rejects kid outside age group', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 4);

      prisma.kidProfile.findFirst.mockResolvedValue({
        id: 'kid-1',
        parentId: 'parent-1',
        dateOfBirth: dob,
      } as never);

      prisma.trainingBatch.findFirst.mockResolvedValue({
        id: 'batch-1',
        isActive: true,
        maxCapacity: 20,
        program: { isActive: true, minAge: 9, maxAge: 12, fee: '2500' },
        _count: { enrollments: 0 },
      } as never);

      await expect(
        service.enroll({ kidId: 'kid-1', batchId: 'batch-1' }, 'parent-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmAfterPayment', () => {
    it('activates enrollment and notifies parent', async () => {
      prisma.trainingEnrollment.update.mockResolvedValue({
        id: 'enroll-1',
        kid: { parentId: 'parent-1', firstName: 'Riya', lastName: 'K' },
        batch: {
          trainerId: 'trainer-1',
          name: 'Morning',
          schedule: 'Mon Wed',
          program: { name: 'Juniors' },
        },
      } as never);

      await service.confirmAfterPayment('enroll-1');

      expect(notificationsService.notifyTrainingEnrolled).toHaveBeenCalledWith(
        'parent-1',
        expect.objectContaining({ enrollmentId: 'enroll-1' }),
      );
      expect(notificationsService.notifyTrainerNewEnrollment).toHaveBeenCalledWith(
        'trainer-1',
        expect.objectContaining({ enrollmentId: 'enroll-1' }),
      );
    });
  });
});

describe('age-groups', () => {
  it('calculates age correctly', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 10);
    expect(calculateAge(dob)).toBe(10);
  });
});
