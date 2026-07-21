import { computeAvailabilityStatus, isBookableStatus } from './availability-status.util';

describe('computeAvailabilityStatus', () => {
  it('returns operational overrides before FULL', () => {
    expect(
      computeAvailabilityStatus({
        operationalState: 'MAINTENANCE',
        capacity: 4,
        availableSeats: 0,
      }),
    ).toBe('MAINTENANCE');
    expect(
      computeAvailabilityStatus({
        operationalState: 'TOURNAMENT',
        capacity: 4,
        availableSeats: 4,
      }),
    ).toBe('TOURNAMENT');
    expect(
      computeAvailabilityStatus({
        operationalState: 'PRIVATE',
        capacity: 4,
        availableSeats: 4,
      }),
    ).toBe('PRIVATE');
    expect(
      computeAvailabilityStatus({
        operationalState: 'CLOSED',
        capacity: 4,
        availableSeats: 4,
      }),
    ).toBe('CLOSED');
  });

  it('returns BLOCKED variants from legacy fields', () => {
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

  it('returns RESERVED when holds exist but seats remain', () => {
    expect(
      computeAvailabilityStatus({
        isBlocked: false,
        capacity: 4,
        availableSeats: 2,
        reservedSeats: 1,
      }),
    ).toBe('RESERVED');
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

  it('only AVAILABLE and FEW_SPOTS are bookable', () => {
    expect(isBookableStatus('AVAILABLE')).toBe(true);
    expect(isBookableStatus('FEW_SPOTS')).toBe(true);
    expect(isBookableStatus('FULL')).toBe(false);
    expect(isBookableStatus('BLOCKED')).toBe(false);
    expect(isBookableStatus('TOURNAMENT')).toBe(false);
  });
});
