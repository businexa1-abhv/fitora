import { BookingSource } from '@prisma/client';
import { ChannelAvailabilityService } from './channel-availability.service';

describe('ChannelAvailabilityService', () => {
  const prisma = {
    booking: { findFirst: jest.fn() },
    courtSlot: { findFirst: jest.fn() },
    integrationConflict: { create: jest.fn() },
  };
  const availability = {
    reserve: jest.fn(),
  };
  const identity = {
    id: 'integration-id',
    tenantId: 'tenant-id',
    provider: 'PLAYO',
    ownerId: 'owner-id',
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates five-minute external holds and bypasses player hold quota', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.courtSlot.findFirst.mockResolvedValue({ id: 'slot-id', price: 500 });
    availability.reserve.mockResolvedValue({
      booking: { id: 'booking-id' },
      holdToken: 'hold-token',
      lockedUntil: new Date(),
      availability: {},
    });
    const service = new ChannelAvailabilityService(prisma as never, availability as never);

    await service.hold(identity, {
      courtId: 'court-id',
      slotId: 'slot-id',
      idempotencyKey: 'operation-1',
      seats: 2,
    });

    expect(availability.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-id',
        source: BookingSource.PLAYO,
        ttlMinutes: 5,
        bypassActiveHoldQuota: true,
        integrationId: 'integration-id',
        externalIdempotencyKey: 'operation-1',
      }),
    );
  });

  it('returns the existing booking for a duplicate idempotency key', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'existing',
      holdToken: 'token',
      lockedUntil: new Date(),
    });
    const service = new ChannelAvailabilityService(prisma as never, availability as never);
    const result = await service.hold(identity, {
      courtId: 'court-id',
      slotId: 'slot-id',
      idempotencyKey: 'same-operation',
    });
    expect(result).toMatchObject({ bookingId: 'existing', idempotent: true });
    expect(availability.reserve).not.toHaveBeenCalled();
  });
});
