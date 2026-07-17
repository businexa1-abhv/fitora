import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
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

const revenueOrchestratorMock = {
  onPaymentCompleted: jest.fn(),
  onPaymentRefunded: jest.fn(),
  recordWebhookEvent: jest.fn().mockResolvedValue({ duplicate: false, id: 'wh-1' }),
  markWebhookProcessed: jest.fn(),
  isEnabled: jest.fn().mockReturnValue(true),
};

describe('PaymentsService webhook', () => {
  let service: PaymentsService;
  let prisma: jest.Mocked<Pick<PrismaService, 'payment' | 'paymentInvoice'>>;

  beforeEach(async () => {
    prisma = {
      payment: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      paymentInvoice: {},
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: { notifyPaymentFailed: jest.fn() } },
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
        { provide: RevenueOrchestrator, useValue: revenueOrchestratorMock },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  afterEach(() => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.PAYMENT_MODE;
    jest.clearAllMocks();
    revenueOrchestratorMock.recordWebhookEvent.mockResolvedValue({ duplicate: false, id: 'wh-1' });
  });

  it('rejects webhook when secret is configured but signature is missing', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
    const body = JSON.stringify({ event: 'payment.captured' });

    await expect(service.handleWebhook(undefined, body)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects webhook with invalid signature', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
    const body = JSON.stringify({ event: 'payment.captured' });

    await expect(service.handleWebhook('invalid-signature', body)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('accepts webhook with valid signature', async () => {
    const secret = 'whsec_test';
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    const body = JSON.stringify({ event: 'payment.authorized' });
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    const result = await service.handleWebhook(signature, body);
    expect(result).toEqual({ received: true });
  });

  it('allows unsigned webhook in mock mode without secret', async () => {
    process.env.PAYMENT_MODE = 'mock';
    const body = JSON.stringify({ event: 'payment.authorized' });

    const result = await service.handleWebhook(undefined, body);
    expect(result).toEqual({ received: true });
  });
});
