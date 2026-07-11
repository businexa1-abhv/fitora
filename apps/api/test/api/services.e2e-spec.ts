import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ServicesController } from '../../src/services/services.controller';
import { ServicesService } from '../../src/services/services.service';
import { closeTestApp, createTestApp } from '../helpers/create-test-app';

const LISTING_ID = '55555555-5555-4555-8555-555555555555';

describe('Services API (integration)', () => {
  let app: INestApplication;
  const servicesService = {
    getCategories: jest.fn(),
    findListings: jest.fn(),
    getListing: jest.fn(),
    getListingReviews: jest.fn(),
    createListing: jest.fn(),
    updateListing: jest.fn(),
    getMyListings: jest.fn(),
    bookService: jest.fn(),
    createReview: jest.fn(),
    getMyOrders: jest.fn(),
    getOrder: jest.fn(),
    getProviderDashboard: jest.fn(),
    getProviderOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
    adminListOrders: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const fixture = await createTestApp({
      controllers: [ServicesController],
      providers: [{ provide: ServicesService, useValue: servicesService }],
    });
    app = fixture.app;
  });

  afterEach(async () => closeTestApp(app));

  it('GET /api/v1/services/categories is public', async () => {
    servicesService.getCategories.mockReturnValue(['STRINGING', 'BAT_REPAIR']);

    const res = await request(app.getHttpServer()).get('/api/v1/services/categories').expect(200);

    expect(res.body).toContain('STRINGING');
  });

  it('GET /api/v1/services/listings browses listings', async () => {
    servicesService.findListings.mockResolvedValue({ items: [], total: 0 });

    await request(app.getHttpServer()).get('/api/v1/services/listings').expect(200);
  });

  it('POST /api/v1/services/listings creates listing for provider', async () => {
    servicesService.createListing.mockResolvedValue({ id: 'listing-1', title: 'Pro Stringing' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/services/listings')
      .set('x-test-role', 'provider')
      .send({
        title: 'Pro Stringing',
        category: 'STRINGING',
        description: 'Expert stringing',
        price: 500,
        city: 'Bangalore',
        sportSlug: 'badminton',
        turnaroundDays: 2,
      })
      .expect(201);

    expect(res.body.title).toBe('Pro Stringing');
  });

  it('POST /api/v1/services/listings/:id/book books service', async () => {
    servicesService.bookService.mockResolvedValue({
      order: { id: 'order-1' },
      payment: { paymentId: 'pay-1' },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/services/listings/${LISTING_ID}/book`)
      .set('x-test-role', 'player')
      .send({
        pickupAddress: '123 Main St',
        pickupPhone: '9999999999',
        pickupCity: 'Bangalore',
        customerNotes: 'Urgent',
      })
      .expect(201);

    expect(res.body.order.id).toBe('order-1');
  });

  it('GET /api/v1/services/dashboard/provider returns provider stats', async () => {
    servicesService.getProviderDashboard.mockResolvedValue({ activeListings: 2, pendingOrders: 1 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/services/dashboard/provider')
      .set('x-test-role', 'provider')
      .expect(200);

    expect(res.body.activeListings).toBe(2);
  });
});
