import { SlotOperationalState } from '@prisma/client';
import { SlotAvailabilityService } from './slot-availability.service';

describe('canonical slot lifecycle derivation', () => {
  const service = Object.create(SlotAvailabilityService.prototype) as SlotAvailabilityService;
  const base = {
    id: 'slot-id',
    courtId: 'court-id',
    capacity: 2,
    reservedCount: 0,
    confirmedCount: 0,
    isBlocked: false,
    blockReason: null,
    operationalState: SlotOperationalState.AVAILABLE,
    version: 1,
    startTime: new Date('2026-08-01T10:00:00.000Z'),
    endTime: new Date('2026-08-01T11:00:00.000Z'),
    price: 500,
  };

  it.each([
    [{}, 'AVAILABLE'],
    [{ reservedCount: 1 }, 'HELD'],
    [{ confirmedCount: 1 }, 'BOOKED'],
    [{ operationalState: SlotOperationalState.MAINTENANCE }, 'MAINTENANCE'],
    [{ operationalState: SlotOperationalState.TOURNAMENT }, 'TOURNAMENT'],
    [{ operationalState: SlotOperationalState.PRIVATE }, 'OWNER_RESERVED'],
    [{ operationalState: SlotOperationalState.BLOCKED, isBlocked: true }, 'BLOCKED'],
  ])('derives %s as %s', (changes, expected) => {
    expect(service.formatAvailability({ ...base, ...changes }).lifecycleStatus).toBe(expected);
  });
});
