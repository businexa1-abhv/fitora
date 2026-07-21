import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentEntityType, PaymentStatus } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriod } from './analytics.constants';
import { PrismaService } from '../prisma/prisma.module';
import { CacheService } from '../common/redis/cache.service';
import { TenantsService } from '../tenants/tenants.service';
import { mockCacheService, mockConfigService } from '../../test/helpers/mock-deps';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      payment: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      membershipPurchase: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      shopOrder: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      shopOrderItem: {
        groupBy: jest.fn(),
      },
      court: {
        count: jest.fn().mockResolvedValue(5),
      },
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: mockCacheService() },
        { provide: ConfigService, useValue: mockConfigService({ CACHE_ENABLED: true }) },
        {
          provide: TenantsService,
          useValue: { resolveTenantId: jest.fn().mockResolvedValue('tenant-1') },
        },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('aggregates revenue by entity type', async () => {
    prisma.payment.findMany.mockResolvedValue([
      {
        amount: 500,
        entityType: PaymentEntityType.BOOKING,
        paidAt: new Date('2026-03-01'),
        createdAt: new Date('2026-03-01'),
      },
      {
        amount: 300,
        entityType: PaymentEntityType.SHOP_ORDER,
        paidAt: new Date('2026-03-02'),
        createdAt: new Date('2026-03-02'),
      },
    ] as never);

    const start = new Date('2026-03-01');
    const end = new Date('2026-03-31');
    const result = await service.getRevenue(AnalyticsPeriod.MONTHLY, start, end);

    expect(result.total).toBe(800);
    expect(result.byEntityType).toHaveLength(2);
  });

  it('calculates retention from repeat bookers', async () => {
    prisma.booking.findMany.mockResolvedValue([
      { userId: 'u1' },
      { userId: 'u1' },
      { userId: 'u2' },
    ] as never);
    prisma.payment.groupBy.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }] as never);

    const start = new Date('2026-03-01');
    const end = new Date('2026-03-31');
    const retention = await service.getRetention(start, end);

    expect(retention.uniqueBookers).toBe(2);
    expect(retention.repeatBookers).toBe(1);
    expect(retention.bookingRetentionRate).toBe(50);
  });

  it('exports revenue csv', async () => {
    prisma.payment.findMany.mockResolvedValue([
      {
        amount: 100,
        entityType: PaymentEntityType.BOOKING,
        paidAt: new Date('2026-03-01'),
        createdAt: new Date('2026-03-01'),
      },
    ] as never);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(10);
    prisma.membershipPurchase.findMany.mockResolvedValue([]);
    prisma.membershipPurchase.count.mockResolvedValue(0);
    prisma.shopOrder.findMany.mockResolvedValue([]);
    prisma.shopOrder.count.mockResolvedValue(0);
    prisma.shopOrderItem.groupBy.mockResolvedValue([]);
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 100 } } as never);
    prisma.booking.count.mockResolvedValue(0);
    prisma.payment.groupBy.mockResolvedValue([]);

    const csv = await service.exportCsv('revenue', { period: AnalyticsPeriod.MONTHLY });
    expect(csv).toContain('Period,Revenue');
  });
});
