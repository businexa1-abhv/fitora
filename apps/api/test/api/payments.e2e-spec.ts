import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PaymentsController } from '../../src/payments/payments.controller';
import { PaymentsService } from '../../src/payments/payments.service';
import { closeTestApp, createTestApp } from '../helpers/create-test-app';

describe('Payments API (integration)', () => {
  let app: INestApplication;
  const paymentsService = {
    getConfig: jest.fn(),
    getMyPayments: jest.fn(),
    getMyInvoices: jest.fn(),
    adminListPayments: jest.fn(),
    getPaymentReports: jest.fn(),
    getPaymentInvoice: jest.fn(),
    getPaymentById: jest.fn(),
    verifyPayment: jest.fn(),
    mockComplete: jest.fn(),
    refundPayment: jest.fn(),
    handleWebhook: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const fixture = await createTestApp({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    });
    app = fixture.app;
  });

  afterEach(async () => closeTestApp(app));

  it('GET /api/v1/payments/config is public', async () => {
    paymentsService.getConfig.mockReturnValue({ provider: 'razorpay', mockMode: true });

    const res = await request(app.getHttpServer()).get('/api/v1/payments/config').expect(200);

    expect(res.body.mockMode).toBe(true);
  });

  it('GET /api/v1/payments/my returns payment history', async () => {
    paymentsService.getMyPayments.mockResolvedValue({ items: [], total: 0 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/payments/my')
      .set('x-test-role', 'player')
      .expect(200);

    expect(res.body.total).toBe(0);
  });

  it('GET /api/v1/payments/admin/reports requires admin', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/payments/admin/reports')
      .set('x-test-role', 'player')
      .expect(403);
  });

  it('GET /api/v1/payments/admin/reports works for admin', async () => {
    paymentsService.getPaymentReports.mockResolvedValue({
      summary: { totalRevenue: 1000 },
      byEntityType: [],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/payments/admin/reports')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(res.body.summary.totalRevenue).toBe(1000);
  });

  it('POST /api/v1/payments/mock-complete completes mock payment', async () => {
    paymentsService.mockComplete.mockResolvedValue({ status: 'PAID' });

    await request(app.getHttpServer())
      .post('/api/v1/payments/mock-complete')
      .set('x-test-role', 'player')
      .send({ paymentId: 'pay-1' })
      .expect(201);
  });

  it('POST /api/v1/payments/verify verifies razorpay signature', async () => {
    paymentsService.verifyPayment.mockResolvedValue({ status: 'PAID' });

    await request(app.getHttpServer())
      .post('/api/v1/payments/verify')
      .set('x-test-role', 'player')
      .send({
        paymentId: 'pay-1',
        razorpayOrderId: 'order_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'sig',
      })
      .expect(201);
  });
});
