import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import { TrainingService } from './training.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { SlotEventsService } from '../realtime/slot-events.service';
import { mockNotificationsService, mockPaymentsService } from '../../test/helpers/mock-deps';

describe('TrainingService (extended)', () => {
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

  const owner = { id: 'owner-1', email: 'o@f.com', roles: [UserRole.COURT_OWNER] };

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
        findMany: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: mockPaymentsService() },
        { provide: NotificationsService, useValue: mockNotificationsService() },
        { provide: SlotEventsService, useValue: { emitCoachUpdated: jest.fn() } },
      ],
    }).compile();

    service = module.get(TrainingService);
  });

  it('getAgeGroupPresets returns presets', () => {
    const presets = service.getAgeGroupPresets();
    expect(presets.length).toBeGreaterThan(0);
  });

  it('getPrograms lists programs', async () => {
    prisma.trainingProgram.findMany.mockResolvedValue([]);
    const programs = await service.getPrograms();
    expect(programs).toEqual([]);
  });

  it('getProgram throws when missing', async () => {
    prisma.trainingProgram.findFirst.mockResolvedValue(null);
    await expect(service.getProgram('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createKid registers kid profile', async () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 10);

    prisma.kidProfile.create.mockResolvedValue({
      id: 'kid-1',
      parentId: 'parent-1',
      firstName: 'Riya',
      lastName: 'K',
      dateOfBirth: dob,
      gender: 'FEMALE',
      emergencyContact: 'Parent',
      emergencyPhone: '9999999999',
    } as never);

    const kid = await service.createKid(
      {
        firstName: 'Riya',
        lastName: 'K',
        dateOfBirth: dob.toISOString(),
        emergencyContact: 'Parent',
        emergencyPhone: '9999999999',
      },
      'parent-1',
    );

    expect(kid.firstName).toBe('Riya');
  });

  it('getMyKids returns parent kids', async () => {
    prisma.kidProfile.findMany.mockResolvedValue([]);
    const kids = await service.getMyKids('parent-1');
    expect(kids).toEqual([]);
  });

  it('getParentDashboard returns dashboard data', async () => {
    prisma.kidProfile.findMany.mockResolvedValue([]);
    prisma.progressReport.findMany.mockResolvedValue([]);

    const dashboard = await service.getParentDashboard('parent-1');
    expect(dashboard.kids).toEqual([]);
  });

  it('deleteProgram forbids non-owner', async () => {
    prisma.trainingProgram.findFirst.mockResolvedValue({
      id: 'prog-1',
      court: { ownerId: 'other' },
    } as never);

    await expect(
      service.deleteProgram('prog-1', { id: 'u1', email: 'x@f.com', roles: [UserRole.PLAYER] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('markAttendance records attendance', async () => {
    prisma.trainingEnrollment.findFirst.mockResolvedValue({
      id: 'enroll-1',
      batch: { trainerId: 'trainer-1', program: { court: { ownerId: 'owner-1' } } },
      kid: { parentId: 'parent-1' },
    } as never);
    prisma.attendanceRecord.upsert.mockResolvedValue({
      id: 'att-1',
      enrollmentId: 'enroll-1',
      date: new Date('2026-03-01'),
      present: true,
    } as never);

    const result = await service.markAttendance(
      'enroll-1',
      { date: '2026-03-01', present: true },
      { id: 'trainer-1', email: 't@f.com', roles: [UserRole.TRAINER] },
    );

    expect(result.present).toBe(true);
  });

  it('getTrainers returns active trainers', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 'trainer-1', firstName: 'T', lastName: 'One', email: 't@f.com' },
    ] as never);

    const trainers = await service.getTrainers();
    expect(trainers).toHaveLength(1);
  });

  it('getPrograms filters by court', async () => {
    prisma.trainingProgram.findMany.mockResolvedValue([]);
    const programs = await service.getPrograms('court-1');
    expect(programs).toEqual([]);
  });

  const fullProgram = {
    id: 'prog-1',
    courtId: 'court-1',
    name: 'Basics',
    description: 'Learn',
    fee: 2000,
    minAge: 6,
    maxAge: 12,
    isActive: true,
    deletedAt: null,
    sportId: 'sport-1',
    court: { id: 'court-1', name: 'Arena', city: 'BLR', ownerId: 'owner-1' },
    sport: { id: 'sport-1', name: 'Badminton', slug: 'badminton' },
    batches: [],
  };

  it('createProgram creates program for court owner', async () => {
    prisma.court.findUnique.mockResolvedValue({ id: 'court-1', ownerId: 'owner-1' } as never);
    prisma.sport.findFirst.mockResolvedValue({ id: 'sport-1', slug: 'badminton' } as never);
    prisma.trainingProgram.create.mockResolvedValue(fullProgram as never);

    const result = await service.createProgram(
      'court-1',
      {
        name: 'Basics',
        sportId: 'sport-1',
        fee: 2000,
        minAge: 6,
        maxAge: 12,
        description: 'Learn',
      },
      owner,
    );
    expect(result.fee).toBe('2000');
  });

  it('createBatch creates batch with trainer', async () => {
    prisma.trainingProgram.findFirst.mockResolvedValue(fullProgram as never);
    prisma.user.findFirst.mockResolvedValue({ id: 'trainer-1' } as never);
    prisma.trainingBatch.create.mockResolvedValue({
      id: 'batch-1',
      name: 'Morning',
      program: fullProgram,
      trainer: { id: 'trainer-1', firstName: 'T', lastName: 'R' },
      enrollments: [],
    } as never);

    const batch = await service.createBatch(
      'prog-1',
      { name: 'Morning', trainerId: 'trainer-1', schedule: 'Mon 6pm', maxCapacity: 10 },
      owner,
    );
    expect(batch.name).toBe('Morning');
  });

  it('getOwnerDashboard returns owner stats', async () => {
    prisma.trainingProgram.findMany.mockResolvedValue([
      { ...fullProgram, _count: { batches: 1 }, batches: [{ _count: { enrollments: 2 } }] },
    ] as never);
    prisma.trainingEnrollment.aggregate.mockResolvedValue({
      _sum: { amountPaid: 5000 },
      _count: 4,
    } as never);
    prisma.trainingEnrollment.count.mockResolvedValue(3);

    const dashboard = await service.getOwnerDashboard(owner);
    expect(dashboard.programs).toHaveLength(1);
    expect(dashboard.activeEnrollments).toBe(3);
    expect(dashboard.totalRevenue).toBe(5000);
  });
});
