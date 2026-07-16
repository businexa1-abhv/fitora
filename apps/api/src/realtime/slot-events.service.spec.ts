import { SlotEventsService } from './slot-events.service';

describe('SlotEventsService', () => {
  it('delivers slot:updated to registered listeners', async () => {
    const events = new SlotEventsService();
    const seen: Array<{ event: string; payload: unknown }> = [];
    events.onEvent((event, payload) => {
      seen.push({ event, payload });
    });

    await events.emitSlotUpdated({
      id: 'slot-1',
      courtId: 'court-1',
      capacity: 4,
      reservedSeats: 1,
      confirmedSeats: 0,
      availableSeats: 3,
      availabilityStatus: 'AVAILABLE',
      isBooked: false,
      isBlocked: false,
      startTime: new Date('2026-07-20T10:00:00.000Z'),
      endTime: new Date('2026-07-20T11:00:00.000Z'),
      price: '500',
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      event: 'slot:updated',
      payload: { id: 'slot-1', availableSeats: 3, courtId: 'court-1' },
    });
  });

  it('unsubscribes listeners', async () => {
    const events = new SlotEventsService();
    const listener = jest.fn();
    const off = events.onEvent(listener);
    off();

    await events.emitSlotReleased({
      slotId: 'slot-1',
      courtId: 'court-1',
      reason: 'cancelled',
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
