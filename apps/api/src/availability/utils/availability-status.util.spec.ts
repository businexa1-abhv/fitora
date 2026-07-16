import { computeAvailabilityStatus } from './availability-status.util';

describe('computeAvailabilityStatus', () => {
  it('returns BLOCKED variants', () => {
    expect(
      computeAvailabilityStatus({
        isBlocked: true,
        blockReason: 'MAINTENANCE',
        capacity: 4,
        availableSeats: 4,
      }),
    ).toBe('MAINTENANCE');
    expect(
      computeAvailabilityStatus({
        isBlocked: true,
        blockReason: 'HOLIDAY',
        capacity: 4,
        availableSeats: 4,
      }),
    ).toBe('HOLIDAY');
    expect(
      computeAvailabilityStatus({
        isBlocked: true,
        blockReason: 'BLOCKED',
        capacity: 4,
        availableSeats: 4,
      }),
    ).toBe('BLOCKED');
  });

  it('returns FULL / FEW_SPOTS / AVAILABLE', () => {
    expect(
      computeAvailabilityStatus({
        isBlocked: false,
        capacity: 4,
        availableSeats: 0,
      }),
    ).toBe('FULL');
    expect(
      computeAvailabilityStatus({
        isBlocked: false,
        capacity: 4,
        availableSeats: 1,
      }),
    ).toBe('FEW_SPOTS');
    expect(
      computeAvailabilityStatus({
        isBlocked: false,
        capacity: 4,
        availableSeats: 3,
      }),
    ).toBe('AVAILABLE');
  });
});
