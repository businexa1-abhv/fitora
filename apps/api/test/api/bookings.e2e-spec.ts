import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { BookingsController } from '../../src/bookings/bookings.controller';
import { BookingsService } from '../../src/bookings/bookings.service';
import { RecurringBookingService } from '../../src/bookings/recurring-booking.service';
import { closeTestApp, createTestApp } from '../helpers/create-test-app';

const COURT_ID = '11111111-1111-4111-8111-111111111111';
const SLOT_ID = '22222222-2222-4222-8222-222222222222';

describe('Bookings API (integration)', () => {
  let app: INestApplication;
  const bookingsService = {
    createBooking: jest.fn(),
    getHistory: jest.fn(),
    findOne: jest.fn(),
    getRefundPreview: jest.fn(),
    cancelBooking: jest.fn(),
    checkIn: jest.fn(),
    getQrCode: jest.fn(),
    listCourtBookings: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const fixture = await createTestApp({
      controllers: [BookingsController],
      providers: [
        { provide: BookingsService, useValue: bookingsService },
        {
          provide: RecurringBookingService,
          useValue: { createRecurringBooking: jest.fn(), listRecurringBookings: jest.fn() },
        },
      ],
    });
    app = fixture.app;
  });

  afterEach(async () => closeTestApp(app));

  it('POST /api/v1/bookings creates booking', async () => {
    bookingsService.createBooking.mockResolvedValue({
      booking: { id: 'b1' },
      lockExpiresAt: new Date().toISOString(),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('x-test-role', 'player')
      .send({ courtId: COURT_ID, slotId: SLOT_ID })
      .expect(201);

    expect(res.body.booking.id).toBe('b1');
    expect(bookingsService.createBooking).toHaveBeenCalledWith(
      { courtId: COURT_ID, slotId: SLOT_ID },
      'player-1',
    );
  });

  it('POST /api/v1/bookings rejects missing slotId', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('x-test-role', 'player')
      .send({ courtId: COURT_ID })
      .expect(400);
  });

  it('GET /api/v1/bookings/my returns history', async () => {
    bookingsService.getHistory.mockResolvedValue({ items: [], total: 0, page: 1 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/bookings/my')
      .set('x-test-role', 'player')
      .expect(200);

    expect(res.body.total).toBe(0);
  });

  it('GET /api/v1/bookings/:id returns booking details', async () => {
    bookingsService.findOne.mockResolvedValue({ id: 'b1', status: 'CONFIRMED' });

    const res = await request(app.getHttpServer())
      .get('/api/v1/bookings/b1')
      .set('x-test-role', 'player')
      .expect(200);

    expect(res.body.status).toBe('CONFIRMED');
  });

  it('POST /api/v1/bookings/:id/cancel cancels booking', async () => {
    bookingsService.cancelBooking.mockResolvedValue({ refundAmount: 500 });

    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings/b1/cancel')
      .set('x-test-role', 'player')
      .send({ reason: 'Plans changed' })
      .expect(201);

    expect(res.body.refundAmount).toBe(500);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/bookings/my').expect(401);
  });
});
