import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentEntityType, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { BookingsService } from '../bookings/bookings.service';
import { TrainingService } from '../training/training.service';
import { ShopService } from '../shop/shop.service';
import { PrintService } from '../print/print.service';
import { ServicesService } from '../services/services.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { QueueJobsService } from '../queue/queue-jobs.service';
import { WalletService } from '../wallet/wallet.service';
import { TenantsService } from '../tenants/tenants.service';
import { SlotEventsService } from '../realtime/slot-events.service';
import { RevenueOrchestrator } from '../finance/revenue.orchestrator';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: jest.Mocked<
    Pick<
      PrismaService,
      | 'payment'
      | 'paymentInvoice'
      | 'membershipPurchase'
      | 'booking'
      | 'serviceOrder'
      | 'printOrder'
      | 'trainingEnrollment'
      | 'shopInvoice'
    >
  >;

  beforeEach(async () => {
    prisma = {
      payment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      paymentInvoice: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      membershipPurchase: { findUnique: jest.fn(), update: jest.fn() },
      booking: { findUnique: jest.fn() },
      serviceOrder: { findUnique: jest.fn() },
      printOrder: { findUnique: jest.fn() },
      trainingEnrollment: { findUnique: jest.fn() },
      shopInvoice: { findFirst: jest.fn() },
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: { notifyPaymentSuccess: jest.fn() } },
        { provide: BookingsService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: TrainingService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: ShopService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: PrintService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: ServicesService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: WalletService, useValue: { creditFromTopup: jest.fn() } },
        {
          provide: QueueJobsService,
          useValue: { enqueueRefund: jest.fn(), enqueuePaymentRetry: jest.fn() },
        },
        {
          provide: TenantsService,
          useValue: {
            resolveTenantIdFromContext: jest.fn().mockReturnValue(null),
            getPaymentConfig: jest.fn(),
          },
        },
        {
          provide: SlotEventsService,
          useValue: { emitPaymentUpdated: jest.fn(), emitMembershipUpdated: jest.fn() },
        },
        {
          provide: RevenueOrchestrator,
          useValue: {
            onPaymentCompleted: jest.fn(),
            onPaymentRefunded: jest.fn(),
            recordWebhookEvent: jest.fn().mockResolvedValue({ duplicate: false, id: 'wh-1' }),
            markWebhookProcessed: jest.fn(),
            isEnabled: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('returns payment config', () => {
    expect(service.getConfig()).toHaveProperty('provider', 'razorpay');
  });

  describe('refundPayment', () => {
    it('rejects refund for non-paid payment', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PENDING,
        amount: 500,
        deletedAt: null,
      } as never);

      await expect(service.refundPayment('pay-1', 100)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getPaymentReports', () => {
    it('aggregates revenue by entity type', async () => {
      prisma.payment.findMany.mockResolvedValue([
        {
          amount: 500,
          status: PaymentStatus.PAID,
          entityType: PaymentEntityType.BOOKING,
          paidAt: new Date(),
          createdAt: new Date(),
        },
        {
          amount: 300,
          status: PaymentStatus.PAID,
          entityType: PaymentEntityType.SHOP_ORDER,
          paidAt: new Date(),
          createdAt: new Date(),
        },
      ] as never);

      const report = await service.getPaymentReports({ days: 30 });
      expect(report.summary.totalRevenue).toBe(800);
      expect(report.summary.paidCount).toBe(2);
    });
  });

  describe('createPaymentOrder', () => {
    it('rejects zero amount', async () => {
      await expect(
        service.createPaymentOrder('u1', 0, PaymentEntityType.BOOKING, 'b1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates mock payment order', async () => {
      prisma.payment.create.mockResolvedValue({
        id: 'pay-new',
        userId: 'u1',
        amount: 500,
        status: PaymentStatus.PENDING,
      } as never);

      const result = await service.createPaymentOrder(
        'u1',
        500,
        PaymentEntityType.BOOKING,
        'booking-1',
      );

      expect(result.paymentId).toBe('pay-new');
      expect(result.mockMode).toBe(true);
    });

    it('returns existing payment for idempotency key', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-existing',
        amount: 500,
        status: PaymentStatus.PENDING,
        entityType: PaymentEntityType.BOOKING,
        entityId: 'b1',
      } as never);

      const result = await service.createPaymentOrder(
        'u1',
        500,
        PaymentEntityType.BOOKING,
        'b1',
        'idem-key-1',
      );

      expect(result.paymentId).toBe('pay-existing');
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('getMyPayments', () => {
    it('paginates user payments', async () => {
      prisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: 500,
          status: PaymentStatus.PAID,
          entityType: PaymentEntityType.BOOKING,
          entityId: 'b1',
          createdAt: new Date(),
          updatedAt: new Date(),
          paidAt: new Date(),
          razorpayOrderId: null,
          razorpayPaymentId: null,
          invoice: null,
        },
      ] as never);
      prisma.payment.count.mockResolvedValue(1);

      const result = await service.getMyPayments('u1', { page: 1 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getPaymentById', () => {
    it('forbids access to other users payment', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        userId: 'other',
        deletedAt: null,
        amount: 500,
        status: PaymentStatus.PAID,
        entityType: PaymentEntityType.BOOKING,
        entityId: 'b1',
        createdAt: new Date(),
        paidAt: new Date(),
        invoice: null,
        user: { id: 'other', firstName: 'X', lastName: 'Y', email: 'x@f.com' },
      } as never);

      await expect(
        service.getPaymentById('pay-1', { id: 'u1', email: 'u@f.com', roles: [] }),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('mockComplete', () => {
    it('completes pending mock payment', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        userId: 'u1',
        status: PaymentStatus.PENDING,
        amount: 500,
        entityType: PaymentEntityType.BOOKING,
        entityId: 'b1',
        deletedAt: null,
      } as never);
      prisma.payment.update.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PAID,
        amount: 500,
        entityType: PaymentEntityType.BOOKING,
        entityId: 'b1',
        paidAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        invoice: null,
      } as never);
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        court: { name: 'Arena' },
        slot: { startTime: new Date() },
      } as never);
      prisma.paymentInvoice.create.mockResolvedValue({ id: 'inv-1' } as never);

      const result = await service.mockComplete('u1', 'pay-1');
      expect(result.success).toBe(true);
      expect(result.payment.status).toBe(PaymentStatus.PAID);
    });
  });
});
