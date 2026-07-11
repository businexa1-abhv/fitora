import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MembershipsController } from '../../src/memberships/memberships.controller';
import { MembershipsService } from '../../src/memberships/memberships.service';
import { CouponsService } from '../../src/memberships/coupons.service';
import { closeTestApp, createTestApp } from '../helpers/create-test-app';

const PLAN_ID = '66666666-6666-4666-8666-666666666666';
const PRODUCT_ID = '77777777-7777-4777-8777-777777777777';

describe('Memberships API (integration)', () => {
  let app: INestApplication;
  const membershipsService = {
    getPlansByCourt: jest.fn(),
    createPlan: jest.fn(),
    purchase: jest.fn(),
    getMyMemberships: jest.fn(),
    getUsage: jest.fn(),
    renew: jest.fn(),
    setAutoRenew: jest.fn(),
    getDashboard: jest.fn(),
    validateCoupon: jest.fn(),
  };
  const couponsService = {
    listCoupons: jest.fn(),
    createCoupon: jest.fn(),
    updateCoupon: jest.fn(),
    deleteCoupon: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const fixture = await createTestApp({
      controllers: [MembershipsController],
      providers: [
        { provide: MembershipsService, useValue: membershipsService },
        { provide: CouponsService, useValue: couponsService },
      ],
    });
    app = fixture.app;
  });

  afterEach(async () => closeTestApp(app));

  it('GET /api/v1/courts/:courtId/memberships is public', async () => {
    membershipsService.getPlansByCourt.mockResolvedValue([{ id: 'plan-1', name: 'Monthly' }]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/courts/court-1/memberships')
      .expect(200);

    expect(res.body).toHaveLength(1);
  });

  it('POST /api/v1/memberships/purchase requires auth', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/memberships/purchase')
      .send({ planId: PLAN_ID })
      .expect(401);
  });

  it('POST /api/v1/memberships/purchase creates purchase', async () => {
    membershipsService.purchase.mockResolvedValue({
      purchase: { id: 'purchase-1' },
      payment: { paymentId: 'pay-1' },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/memberships/purchase')
      .set('x-test-role', 'player')
      .send({ planId: PLAN_ID })
      .expect(201);

    expect(res.body.purchase.id).toBe('purchase-1');
  });

  it('GET /api/v1/memberships/my returns user memberships', async () => {
    membershipsService.getMyMemberships.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/v1/memberships/my')
      .set('x-test-role', 'player')
      .expect(200);
  });

  it('POST /api/v1/memberships/validate-coupon validates code', async () => {
    membershipsService.validateCoupon.mockResolvedValue({ valid: true, discountAmount: 100 });

    const res = await request(app.getHttpServer())
      .post('/api/v1/memberships/validate-coupon')
      .set('x-test-role', 'player')
      .send({ code: 'SAVE10', appliesTo: 'MEMBERSHIP', orderAmount: 1000 })
      .expect(201);

    expect(res.body.valid).toBe(true);
  });
});
