import { SlotEventsService } from './slot-events.service';

function createEvents() {
  const outbox = {
    enqueue: jest.fn(async (_event: string, data: unknown, meta?: object) => ({
      eventId: 'evt-1',
      event: _event,
      occurredAt: new Date().toISOString(),
      data,
      ...meta,
    })),
    markPublished: jest.fn(async () => undefined),
  };
  return { events: new SlotEventsService(outbox as never), outbox };
}

describe('SlotEventsService', () => {
  it('delivers canonical and legacy slot:updated events', async () => {
    const { events, outbox } = createEvents();
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
      version: 2,
    });

    expect(outbox.enqueue).toHaveBeenCalled();
    expect(seen.some((s) => s.event === 'slot.updated')).toBe(true);
    expect(seen.some((s) => s.event === 'slot:updated')).toBe(true);
    expect(seen.some((s) => s.event === 'slot.available')).toBe(true);
  });

  it('unsubscribes listeners', async () => {
    const { events } = createEvents();
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

  it('emits waitlist.promoted', async () => {
    const { events } = createEvents();
    const listener = jest.fn();
    events.onEvent(listener);
    await events.emitWaitlistPromoted({
      waitlistEntryId: 'w1',
      userId: 'u1',
      slotId: 's1',
      courtId: 'c1',
      seats: 1,
    });
    expect(listener).toHaveBeenCalledWith(
      'waitlist.promoted',
      expect.objectContaining({
        event: 'waitlist.promoted',
      }),
    );
  });
});
