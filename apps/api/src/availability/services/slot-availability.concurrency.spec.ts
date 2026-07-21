import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BookingSource, CourtApprovalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { RedisService } from '../../common/redis/redis.service';
import { SlotEventsService } from '../../realtime/slot-events.service';
import { SlotHoldService } from './slot-hold.service';
import { SlotAvailabilityService } from './slot-availability.service';

/**
 * Simulates Postgres FOR UPDATE: concurrent $transaction callbacks run one-at-a-time
 * against a shared in-memory slot counter.
 */
function createSerializedPrisma(capacity: number) {
  let reservedCount = 0;
  const confirmedCount = 0;
  let bookingSeq = 0;
  let chain: Promise<unknown> = Promise.resolve();

  const slotBase = {
    id: 'slot-1',
    courtId: 'court-1',
    capacity,
    isBlocked: false,
    blockReason: null,
    operationalState: 'AVAILABLE',
    version: 0,
    startTime: new Date(Date.now() + 60 * 60_000),
    endTime: new Date(Date.now() + 2 * 60 * 60_000),
    price: 500,
    deletedAt: null,
    court: {
      deletedAt: null,
      approvalStatus: CourtApprovalStatus.APPROVED,
      isActive: true,
      tenantId: 'tenant-1',
      sport: { id: 'sport-1', name: 'Badminton', slug: 'badminton' },
    },
  };

  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    courtSlot: {
      findFirst: jest.fn(async () => ({
        ...slotBase,
        reservedCount,
        confirmedCount,
      })),
      findUniqueOrThrow: jest.fn(async () => ({
        ...slotBase,
        reservedCount,
        confirmedCount,
      })),
      update: jest.fn(async ({ data }: { data: { reservedCount?: { increment: number } } }) => {
        if (data.reservedCount?.increment) {
          reservedCount += data.reservedCount.increment;
        }
        return { ...slotBase, reservedCount, confirmedCount };
      }),
    },
    booking: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        bookingSeq += 1;
        return {
          id: `booking-${bookingSeq}`,
          ...data,
          court: {
            id: 'court-1',
            name: 'Court 1',
            city: 'Hyd',
            address: 'Addr',
            ownerId: 'owner-1',
            sport: { id: 'sport-1', name: 'Badminton', slug: 'badminton' },
          },
          slot: {
            id: 'slot-1',
            startTime: slotBase.startTime,
            endTime: slotBase.endTime,
            price: slotBase.price,
          },
        };
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => {
      const run = chain.then(() => fn(tx));
      chain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    }),
    courtSlot: {
      findFirst: jest.fn(async () => ({
        ...slotBase,
        reservedCount,
        confirmedCount,
      })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    getSnapshot: () => ({ reservedCount, confirmedCount, bookings: bookingSeq }),
  };

  return prisma;
}

describe('SlotAvailabilityService concurrency', () => {
  async function createService(capacity: number) {
    const prisma = createSerializedPrisma(capacity);
    const events = {
      emitSlotUpdated: jest.fn().mockResolvedValue(undefined),
      emitSlotBooked: jest.fn().mockResolvedValue(undefined),
      emitSlotCancelled: jest.fn().mockResolvedValue(undefined),
      emitSlotReleased: jest.fn().mockResolvedValue(undefined),
      emitBookingConfirmed: jest.fn().mockResolvedValue(undefined),
      enqueueSlotLifecycleInTx: jest.fn().mockResolvedValue({
        eventId: 'evt-1',
        event: 'slot.booked',
        occurredAt: new Date().toISOString(),
        data: {},
      }),
      publishEnvelopes: jest.fn().mockResolvedValue(undefined),
    };
    const holds = { setHold: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotAvailabilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => 15 } },
        {
          provide: RedisService,
          useValue: { getClient: () => null, isAvailable: () => false },
        },
        { provide: SlotHoldService, useValue: holds },
        { provide: SlotEventsService, useValue: events },
      ],
    }).compile();

    return {
      service: module.get(SlotAvailabilityService),
      prisma,
      events,
      holds,
    };
  }

  it('allows exactly capacity concurrent reserves (N>C → C successes)', async () => {
    const capacity = 3;
    const attempts = 8;
    const { service, prisma, events } = await createService(capacity);

    const results = await Promise.allSettled(
      Array.from({ length: attempts }, (_, i) =>
        service.reserve({
          courtId: 'court-1',
          slotId: 'slot-1',
          userId: `user-${i}`,
          seats: 1,
          source: BookingSource.PLAYER_APP,
          subtotalAmount: 500,
          discountAmount: 0,
          totalAmount: 500,
        }),
      ),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(capacity);
    expect(failures).toHaveLength(attempts - capacity);
    for (const failure of failures) {
      expect(failure.status).toBe('rejected');
      if (failure.status === 'rejected') {
        expect(failure.reason).toBeInstanceOf(ConflictException);
      }
    }

    const snap = prisma.getSnapshot();
    expect(snap.reservedCount).toBe(capacity);
    expect(snap.bookings).toBe(capacity);
    expect(events.publishEnvelopes).toHaveBeenCalledTimes(capacity);
    expect(events.enqueueSlotLifecycleInTx).toHaveBeenCalled();
  });

  it('rejects when requesting more seats than remaining capacity', async () => {
    const { service } = await createService(2);

    await service.reserve({
      courtId: 'court-1',
      slotId: 'slot-1',
      userId: 'user-a',
      seats: 2,
      subtotalAmount: 500,
      discountAmount: 0,
      totalAmount: 500,
    });

    await expect(
      service.reserve({
        courtId: 'court-1',
        slotId: 'slot-1',
        userId: 'user-b',
        seats: 1,
        subtotalAmount: 500,
        discountAmount: 0,
        totalAmount: 500,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
