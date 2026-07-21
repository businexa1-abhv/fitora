import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClosureReason, SlotPricingRuleType, UserRole } from '@prisma/client';
import { SlotsService } from './slots.service';
import { PrismaService } from '../prisma/prisma.module';
import { SlotEventsService } from '../realtime/slot-events.service';
import { SlotAvailabilityService } from '../availability/services/slot-availability.service';
import { SubscriptionService } from '../finance/subscription/subscription.service';

describe('SlotsService', () => {
  let service: SlotsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  const events = {
    emitSlotUpdated: jest.fn().mockResolvedValue(undefined),
    emitSlotCreated: jest.fn().mockResolvedValue(undefined),
    emitSlotDeleted: jest.fn().mockResolvedValue(undefined),
    emitSlotBlocked: jest.fn().mockResolvedValue(undefined),
    emitSlotUnblocked: jest.fn().mockResolvedValue(undefined),
    emitSlotClosed: jest.fn().mockResolvedValue(undefined),
    emitSlotPriceChanged: jest.fn().mockResolvedValue(undefined),
    emitSlotCapacityChanged: jest.fn().mockResolvedValue(undefined),
  };
  const availability = {
    setOperationalState: jest.fn(),
    updateCapacity: jest.fn(),
  };

  const ownerUser = { id: 'owner-1', email: 'o@f.com', roles: [UserRole.COURT_OWNER] };
  const mockCourt = {
    id: 'court-1',
    ownerId: 'owner-1',
    defaultSlotPrice: '500',
    approvalStatus: 'APPROVED',
    isActive: true,
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      court: { findFirst: jest.fn() },
      courtSlot: {
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      slotSchedule: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      slotPricingRule: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      courtClosure: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlotEventsService, useValue: events },
        { provide: SlotAvailabilityService, useValue: availability },
        {
          provide: SubscriptionService,
          useValue: { assertTenantCanAcceptBookings: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(SlotsService);
    events.emitSlotUpdated.mockClear();
    events.emitSlotCreated.mockClear();
  });

  describe('generateSlots', () => {
    it('creates slots for a date', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);
      prisma.slotPricingRule.findMany.mockResolvedValue([]);
      prisma.courtClosure.findMany.mockResolvedValue([]);
      prisma.courtSlot.findFirst.mockResolvedValue(null);
      prisma.courtSlot.create.mockResolvedValue({} as never);

      const result = await service.generateSlots(
        'court-1',
        { date: '2026-07-10', startHour: 6, endHour: 8, durationMinutes: 60, price: 500 },
        ownerUser,
      );

      expect(result.created).toBe(2);
    });

    it('forbids non-owner', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);

      await expect(
        service.generateSlots(
          'court-1',
          { date: '2026-07-10', startHour: 6, endHour: 8, durationMinutes: 60, price: 500 },
          { id: 'other', email: 'x@y.com', roles: [UserRole.COURT_OWNER] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createPricingRule', () => {
    it('creates peak pricing rule', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);
      prisma.slotPricingRule.create.mockResolvedValue({
        id: 'rule-1',
        type: SlotPricingRuleType.PEAK,
        name: 'Evening Peak',
      } as never);

      const result = await service.createPricingRule(
        'court-1',
        {
          type: SlotPricingRuleType.PEAK,
          name: 'Evening Peak',
          multiplier: 1.5,
          startHour: 17,
          endHour: 22,
        },
        ownerUser,
      );

      expect(result.type).toBe(SlotPricingRuleType.PEAK);
    });

    it('requires holidayDate for holiday rules', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);

      await expect(
        service.createPricingRule(
          'court-1',
          { type: SlotPricingRuleType.HOLIDAY, name: 'Holiday', multiplier: 1.5 },
          ownerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createClosure', () => {
    it('creates maintenance closure', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);
      prisma.courtClosure.create.mockResolvedValue({
        id: 'closure-1',
        reason: ClosureReason.MAINTENANCE,
      } as never);
      prisma.courtSlot.findMany.mockResolvedValue([]);

      const result = await service.createClosure(
        'court-1',
        {
          startDate: '2026-08-01',
          endDate: '2026-08-03',
          title: 'Court resurfacing',
          reason: ClosureReason.MAINTENANCE,
        },
        ownerUser,
      );

      expect(result.reason).toBe(ClosureReason.MAINTENANCE);
    });
  });

  describe('createSchedule', () => {
    it('creates recurring schedule', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);
      prisma.slotSchedule.create.mockResolvedValue({ id: 'sched-1', name: 'Weekday AM' } as never);

      const result = await service.createSchedule(
        'court-1',
        {
          name: 'Weekday AM',
          daysOfWeek: [1, 2, 3, 4, 5],
          startHour: 6,
          endHour: 12,
          durationMinutes: 60,
          basePrice: 400,
        },
        ownerUser,
      );

      expect(result.name).toBe('Weekday AM');
    });
  });

  describe('getCalendar', () => {
    it('returns calendar summary per day', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);
      prisma.courtSlot.findMany.mockResolvedValue([
        {
          id: 's1',
          courtId: 'court-1',
          scheduleId: null,
          startTime: new Date('2026-07-10T06:00:00.000Z'),
          endTime: new Date('2026-07-10T07:00:00.000Z'),
          price: { toString: () => '500' },
          isBlocked: false,
          blockReason: null,
          notes: null,
          booking: null,
          bookings: [],
          capacity: 1,
          reservedCount: 0,
          confirmedCount: 0,
        },
      ] as never);
      prisma.courtClosure.findMany.mockResolvedValue([]);

      const result = await service.getCalendar(
        'court-1',
        { startDate: '2026-07-10', endDate: '2026-07-10' },
        ownerUser,
      );

      expect(result.days).toHaveLength(1);
      expect(result.days[0].totalSlots).toBe(1);
      expect(result.days[0].availableSlots).toBe(1);
    });
  });
});
