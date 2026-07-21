/**
 * Socket.IO gateway room fan-out for availability events.
 * Uses a lightweight fake Server to avoid spinning up a full Nest WS context.
 */
import { SlotsGateway } from './slots.gateway';
import type { SlotEventsService } from './slot-events.service';
import type { RealtimeOutboxService } from './realtime-outbox.service';

describe('SlotsGateway broadcast', () => {
  it('emits slot:updated to court and court:date rooms', () => {
    const emitted: Array<{ room: string; event: string }> = [];
    const server = {
      to: (room: string) => ({
        emit: (event: string) => {
          emitted.push({ room, event });
        },
      }),
    };

    const gateway = new (
      SlotsGateway as unknown as new (
        events: SlotEventsService,
        outbox: RealtimeOutboxService,
        jwt: unknown,
        config: unknown,
      ) => SlotsGateway
    )(
      { onEvent: () => () => undefined } as never,
      { onPublished: () => () => undefined } as never,
      {},
      {},
    );
    (gateway as unknown as { server: typeof server }).server = server;

    (gateway as unknown as { broadcast: (event: string, payload: unknown) => void }).broadcast(
      'slot:updated',
      {
        id: 'slot-1',
        courtId: 'court-1',
        capacity: 1,
        reservedSeats: 0,
        confirmedSeats: 0,
        availableSeats: 1,
        availabilityStatus: 'AVAILABLE',
        isBooked: false,
        isBlocked: false,
        startTime: '2026-07-21T10:00:00.000Z',
        endTime: '2026-07-21T11:00:00.000Z',
        price: '500',
      },
    );

    expect(emitted).toEqual(
      expect.arrayContaining([
        { room: 'court:court-1', event: 'slot:updated' },
        { room: 'court:court-1:date:2026-07-21', event: 'slot:updated' },
        { room: 'role:admin', event: 'slot:updated' },
      ]),
    );
  });
});
