import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentEntityType, PaymentStatus, UserRole } from '@prisma/client';
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

describe('PaymentsService (extended)', () => {
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
        {
          provide: NotificationsService,
          useValue: { notifyPaymentSuccess: jest.fn(), notifyPaymentFailed: jest.fn() },
        },
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
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('getMyInvoices returns formatted invoices', async () => {
    prisma.paymentInvoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        paymentId: 'pay-1',
        invoiceNumber: 'INV-1',
        entityType: PaymentEntityType.BOOKING,
        entityLabel: 'Booking',
        entityId: 'b1',
        subtotal: 500,
        tax: 0,
        total: 500,
        description: 'Court',
        lineItems: [],
        issuedAt: new Date(),
        payment: { status: PaymentStatus.PAID, paidAt: new Date() },
      },
    ] as never);

    const invoices = await service.getMyInvoices('u1');
    expect(invoices).toHaveLength(1);
  });

  it('adminListPayments paginates ledger', async () => {
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.payment.count.mockResolvedValue(0);

    const result = await service.adminListPayments({ page: 1 });
    expect(result.total).toBe(0);
  });

  it('getPaymentById allows admin access', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      userId: 'other',
      deletedAt: null,
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
      user: { id: 'other', firstName: 'X', lastName: 'Y', email: 'x@f.com' },
    } as never);

    const payment = await service.getPaymentById('pay-1', {
      id: 'admin-1',
      email: 'admin@f.com',
      roles: [UserRole.ADMIN],
    });

    expect(payment.id).toBe('pay-1');
  });

  it('getPaymentById throws when not found', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    await expect(
      service.getPaymentById('x', { id: 'u1', email: 'u@f.com', roles: [UserRole.PLAYER] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refundPayment rejects amount exceeding payment', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.PAID,
      amount: 100,
      deletedAt: null,
    } as never);

    await expect(service.refundPayment('pay-1', 200)).rejects.toThrow();
  });
});
