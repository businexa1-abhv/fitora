import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentEntityType, PaymentStatus, UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { BookingsService } from '../bookings/bookings.service';
import { TrainingService } from '../training/training.service';
import { ShopService } from '../shop/shop.service';
import { PrintService } from '../print/print.service';
import { ServicesService } from '../services/services.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';
import { QueueJobsService } from '../queue/queue-jobs.service';
import { PrismaService } from '../prisma/prisma.module';

describe('PaymentsService (integration)', () => {
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
  let queueJobs: jest.Mocked<Pick<QueueJobsService, 'enqueueRefund' | 'enqueuePaymentRetry'>>;

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

    queueJobs = {
      enqueueRefund: jest.fn(),
      enqueuePaymentRetry: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: { notifyPaymentSuccess: jest.fn(), notifyPaymentFailed: jest.fn() } },
        { provide: BookingsService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: TrainingService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: ShopService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: PrintService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: ServicesService, useValue: { confirmAfterPayment: jest.fn() } },
        { provide: WalletService, useValue: { creditFromTopup: jest.fn() } },
        { provide: QueueJobsService, useValue: queueJobs },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('refundBookingPayment', () => {
    it('enqueues refund for paid booking payment', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PAID,
      } as never);

      const result = await service.refundBookingPayment('booking-1', 500);
      expect(result).toEqual({ queued: true, paymentId: 'pay-1', amount: 500 });
      expect(queueJobs.enqueueRefund).toHaveBeenCalled();
    });

    it('returns null when no payment found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      const result = await service.refundBookingPayment('booking-1', 500);
      expect(result).toBeNull();
    });
  });

  describe('retryPayment', () => {
    it('skips already paid payments', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PAID,
      } as never);

      const result = await service.retryPayment('pay-1');
      expect(result).toEqual({ skipped: true, reason: 'Already paid' });
    });

    it('throws when payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.retryPayment('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('retries pending mock payment', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        userId: 'u1',
        status: PaymentStatus.PENDING,
        amount: 500,
        entityType: PaymentEntityType.BOOKING,
        entityId: 'b1',
        deletedAt: null,
        razorpayOrderId: null,
      } as never);
      prisma.payment.update.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PAID,
        userId: 'u1',
        amount: 500,
        entityType: PaymentEntityType.BOOKING,
        entityId: 'b1',
      } as never);
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        userId: 'u1',
        court: { name: 'Arena' },
        slot: { startTime: new Date() },
      } as never);

      const result = await service.retryPayment('pay-1');
      expect(result.retried).toBe(true);
    });
  });

  describe('retryFailedPayments', () => {
    it('retries recent failed payments', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { id: 'pay-1', status: PaymentStatus.FAILED, deletedAt: null },
      ] as never);
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.FAILED,
        deletedAt: null,
      } as never);

      const result = await service.retryFailedPayments();
      expect(result.retried).toBe(1);
    });
  });
});
