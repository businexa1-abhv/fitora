import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrintController } from '../../src/print/print.controller';
import { PrintService } from '../../src/print/print.service';
import { closeTestApp, createTestApp } from '../helpers/create-test-app';

describe('Print API (integration)', () => {
  let app: INestApplication;
  const printService = {
    getOptions: jest.fn(),
    uploadDesign: jest.fn(),
    getDesign: jest.fn(),
    findListings: jest.fn(),
    findListingById: jest.fn(),
    createListing: jest.fn(),
    updateListing: jest.fn(),
    getMyListings: jest.fn(),
    createOrder: jest.fn(),
    getMyOrders: jest.fn(),
    getOrder: jest.fn(),
    getProviderOrders: jest.fn(),
    adminListOrders: jest.fn(),
    getPrinterDashboard: jest.fn(),
    updateOrderStatus: jest.fn(),
    approveDesign: jest.fn(),
    rejectDesign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const fixture = await createTestApp({
      controllers: [PrintController],
      providers: [{ provide: PrintService, useValue: printService }],
    });
    app = fixture.app;
  });

  afterEach(async () => closeTestApp(app));

  it('GET /api/v1/print/options is public', async () => {
    printService.getOptions.mockReturnValue({ sizes: ['M'], colors: ['Black'] });

    const res = await request(app.getHttpServer()).get('/api/v1/print/options').expect(200);
    expect(res.body.sizes).toContain('M');
  });

  it('POST /api/v1/print/designs/upload requires auth', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/print/designs/upload')
      .send({ fileName: 'a.png', mimeType: 'image/png', dataBase64: 'abc' })
      .expect(401);
  });

  it('POST /api/v1/print/designs/upload delegates to service', async () => {
    printService.uploadDesign.mockResolvedValue({ id: 'd1', fileName: 'a.png' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/print/designs/upload')
      .set('x-test-role', 'player')
      .send({ fileName: 'a.png', mimeType: 'image/png', dataBase64: 'abc' })
      .expect(201);

    expect(res.body.id).toBe('d1');
  });

  it('GET /api/v1/print/listings returns catalog', async () => {
    printService.findListings.mockResolvedValue({ items: [], total: 0, page: 1 });

    const res = await request(app.getHttpServer()).get('/api/v1/print/listings').expect(200);
    expect(res.body.total).toBe(0);
  });

  it('POST /api/v1/print/orders creates order', async () => {
    printService.createOrder.mockResolvedValue({ order: { id: 'o1' }, payment: { paymentId: 'p1' } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/print/listings/11111111-1111-4111-8111-111111111111/orders')
      .set('x-test-role', 'player')
      .send({
        designUrl: 'https://cdn.example/design.png',
        tshirtSize: 'M',
        tshirtColor: 'Black',
        quantity: 1,
        pickupAddress: '123 Main St',
        pickupPhone: '9999999999',
        pickupCity: 'Bangalore',
      })
      .expect(201);

    expect(res.body.order.id).toBe('o1');
  });
});
