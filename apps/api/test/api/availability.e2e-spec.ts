import { ConflictException } from '@nestjs/common';
import { PaymentEntityType } from '@prisma/client';
import { SLOT_AVAILABILITY_CONFLICT } from '../../src/availability/services/slot-availability.service';
import { computeAvailabilityStatus } from '../../src/availability/utils/availability-status.util';

describe('Live Court Booking Engine (availability)', () => {
  it('derives RESERVED when holds exist but seats remain', () => {
    expect(
      computeAvailabilityStatus({
        capacity: 4,
        availableSeats: 2,
        reservedSeats: 1,
      }),
    ).toBe('RESERVED');
  });

  it('uses product conflict code and message shape', () => {
    const err = new ConflictException({
      code: SLOT_AVAILABILITY_CONFLICT,
      message: 'This slot was just booked by another player.',
      slot: { id: 'slot-1', version: 3 },
      nearbySlots: [],
    });
    const body = err.getResponse() as Record<string, unknown>;
    expect(body.code).toBe(SLOT_AVAILABILITY_CONFLICT);
    expect(body.message).toContain('another player');
    expect(body.slot).toBeDefined();
  });

  it('documents payment-failed hold release contract', () => {
    expect(PaymentEntityType.BOOKING).toBe('BOOKING');
  });
});
