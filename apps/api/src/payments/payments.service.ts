import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { addMembershipDuration } from '../memberships/constants/plan-benefits';
import { QueueJobsService } from '../queue/queue-jobs.service';
import {
  PaymentEntityType,
  PaymentStatus,
  Prisma,
  UserRole,
  WebhookEventStatus,
} from '@prisma/client';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'crypto';
import { BookingsService } from '../bookings/bookings.service';
import { ShopService } from '../shop/shop.service';
import { PrintService } from '../print/print.service';
import { ServicesService } from '../services/services.service';
import { TrainingService } from '../training/training.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../prisma/prisma.module';
import { SlotEventsService } from '../realtime/slot-events.service';
import { TenantsService } from '../tenants/tenants.service';
import { generatePaymentInvoiceNumber, PAYMENT_ENTITY_LABELS } from './payments.constants';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { RevenueOrchestrator } from '../finance/revenue.orchestrator';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay | null = null;
  private readonly isMockMode: boolean;

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private tenantsService: TenantsService,
    private events: SlotEventsService,
    @Inject(forwardRef(() => BookingsService))
    private bookingsService: BookingsService,
    @Inject(forwardRef(() => TrainingService))
    private trainingService: TrainingService,
    @Inject(forwardRef(() => ShopService))
    private shopService: ShopService,
    @Inject(forwardRef(() => PrintService))
    private printService: PrintService,
    @Inject(forwardRef(() => ServicesService))
    private servicesService: ServicesService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
    @Inject(forwardRef(() => QueueJobsService))
    private queueJobs: QueueJobsService,
    @Inject(forwardRef(() => RevenueOrchestrator))
    private revenueOrchestrator: RevenueOrchestrator,
  ) {
    this.isMockMode = process.env.PAYMENT_MODE === 'mock' || !process.env.RAZORPAY_KEY_ID;

    if (!this.isMockMode) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });
    }
  }

  async createPaymentOrder(
    userId: string,
    amount: number,
    entityType: PaymentEntityType,
    entityId: string,
    idempotencyKey?: string,
    tenantId?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    const resolvedTenantId =
      tenantId ?? this.tenantsService.resolveTenantIdFromContext() ?? undefined;

    if (idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return this.formatPaymentResponse(existing);
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        tenantId: resolvedTenantId,
        amount,
        entityType,
        entityId,
        idempotencyKey,
        status: PaymentStatus.PENDING,
      },
    });

    const { client, keyId, isMock } = await this.getRazorpayClient(resolvedTenantId);

    if (isMock) {
      return {
        paymentId: payment.id,
        orderId: `mock_order_${payment.id}`,
        amount: amount * 100,
        currency: 'INR',
        keyId: 'mock_key',
        mockMode: true,
      };
    }

    const order = await client!.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: payment.id,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { razorpayOrderId: order.id },
    });

    return {
      paymentId: payment.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      mockMode: false,
    };
  }

  /**
   * Record an on-site (cash/UPI/card) payment as PAID and issue invoice.
   * Used for owner walk-in bookings — does not confirm the booking (caller already did).
   */
  async recordWalkInPayment(input: {
    userId: string;
    bookingId: string;
    amount: number;
    paymentMethod: string;
    tenantId?: string | null;
  }) {
    if (input.amount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId ?? undefined,
        amount: input.amount,
        entityType: PaymentEntityType.BOOKING,
        entityId: input.bookingId,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        metadata: {
          source: 'OWNER_WALK_IN',
          paymentMethod: input.paymentMethod,
        },
        razorpayPaymentId: `walkin_${input.bookingId.slice(0, 8)}_${Date.now()}`,
      },
    });

    const invoice = await this.createPaymentInvoice(payment);

    const booking = await this.prisma.booking.findUnique({
      where: { id: input.bookingId },
      select: { courtId: true },
    });
    await this.events.emitPaymentUpdated({
      paymentId: payment.id,
      userId: input.userId,
      courtId: booking?.courtId ?? null,
      status: PaymentStatus.PAID,
      amount: input.amount,
    });

    return {
      payment: this.formatPaymentResponse(payment),
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: String(invoice.total),
          }
        : null,
    };
  }

  private async getRazorpayClient(tenantId?: string): Promise<{
    client: Razorpay | null;
    keyId: string;
    isMock: boolean;
    webhookSecret?: string | null;
  }> {
    if (tenantId) {
      const config = await this.tenantsService.getPaymentConfig(tenantId);
      if (config.mode === 'tenant' && config.keyId && config.keySecret) {
        return {
          client: new Razorpay({ key_id: config.keyId, key_secret: config.keySecret }),
          keyId: config.keyId,
          isMock: false,
          webhookSecret: config.webhookSecret,
        };
      }
    }

    const isMock = process.env.PAYMENT_MODE === 'mock' || !process.env.RAZORPAY_KEY_ID;

    if (isMock) {
      return { client: null, keyId: 'mock_key', isMock: true };
    }

    if (!this.razorpay) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });
    }

    return {
      client: this.razorpay,
      keyId: process.env.RAZORPAY_KEY_ID!,
      isMock: false,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    };
  }

  getConfig() {
    return { mockMode: this.isMockMode, provider: 'razorpay' };
  }

  async getMyPayments(
    userId: string,
    params?: {
      status?: PaymentStatus;
      entityType?: PaymentEntityType;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const where: Prisma.PaymentWhereInput = {
      userId,
      deletedAt: null,
      ...(params?.status && { status: params.status }),
      ...(params?.entityType && { entityType: params.entityType }),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { invoice: true },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items: items.map((p) => this.formatPaymentRecord(p)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getPaymentById(paymentId: string, user: AuthUserPayload) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
      include: {
        invoice: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const isOwner = payment.userId === user.id;
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    if (!isOwner && !isAdmin) throw new ForbiddenException('Access denied');

    return this.formatPaymentRecord(payment);
  }

  async getMyInvoices(userId: string) {
    const invoices = await this.prisma.paymentInvoice.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      include: { payment: { select: { status: true, paidAt: true } } },
    });
    return invoices.map((inv) => this.formatInvoice(inv));
  }

  async getPaymentInvoice(paymentId: string, user: AuthUserPayload) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const isOwner = payment.userId === user.id;
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    if (!isOwner && !isAdmin) throw new ForbiddenException('Access denied');

    if (payment.entityType === PaymentEntityType.SHOP_ORDER) {
      const shopInvoice = await this.prisma.shopInvoice.findFirst({
        where: { orderId: payment.entityId },
      });
      if (shopInvoice) {
        return {
          id: shopInvoice.id,
          invoiceNumber: shopInvoice.invoiceNumber,
          paymentId: payment.id,
          entityType: payment.entityType,
          entityId: payment.entityId,
          subtotal: String(shopInvoice.subtotal),
          tax: '0',
          total: String(shopInvoice.total),
          description: 'Store order invoice',
          lineItems: null,
          issuedAt: shopInvoice.issuedAt.toISOString(),
        };
      }
    }

    const invoice = await this.prisma.paymentInvoice.findUnique({ where: { paymentId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.formatInvoice(invoice);
  }

  async adminListPayments(params?: {
    status?: PaymentStatus;
    entityType?: PaymentEntityType;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 25;
    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(params?.status && { status: params.status }),
      ...(params?.entityType && { entityType: params.entityType }),
      ...(params?.search && {
        OR: [
          { razorpayOrderId: { contains: params.search, mode: 'insensitive' } },
          { razorpayPaymentId: { contains: params.search, mode: 'insensitive' } },
          { user: { email: { contains: params.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          invoice: { select: { invoiceNumber: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items: items.map((p) => this.formatPaymentRecord(p)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getPaymentReports(params?: { days?: number }) {
    const days = params?.days ?? 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const payments = await this.prisma.payment.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      select: { amount: true, status: true, entityType: true, paidAt: true, createdAt: true },
    });

    const taxAgg = await this.prisma.paymentInvoice.aggregate({
      where: {
        payment: { deletedAt: null, status: PaymentStatus.PAID, paidAt: { gte: since } },
      },
      _sum: { tax: true },
    });

    const paid = payments.filter((p) => p.status === PaymentStatus.PAID);
    const refunded = payments.filter((p) =>
      ([PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] as PaymentStatus[]).includes(
        p.status,
      ),
    );
    const failed = payments.filter((p) => p.status === PaymentStatus.FAILED);
    const pending = payments.filter((p) => p.status === PaymentStatus.PENDING);

    const byEntityType = Object.values(PaymentEntityType).map((type) => {
      const rows = paid.filter((p) => p.entityType === type);
      return {
        entityType: type,
        label: PAYMENT_ENTITY_LABELS[type],
        count: rows.length,
        revenue: rows.reduce((sum, p) => sum + Number(p.amount), 0),
      };
    });

    return {
      periodDays: days,
      summary: {
        totalTransactions: payments.length,
        paidCount: paid.length,
        failedCount: failed.length,
        pendingCount: pending.length,
        refundedCount: refunded.length,
        totalRevenue: paid.reduce((sum, p) => sum + Number(p.amount), 0),
        refundedAmount: refunded.reduce((sum, p) => sum + Number(p.amount), 0),
        totalTax: Number(taxAgg._sum.tax ?? 0),
      },
      byEntityType: byEntityType.filter((r) => r.count > 0),
    };
  }

  async refundPayment(paymentId: string, amount: number, reason?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (
      !([PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] as PaymentStatus[]).includes(
        payment.status,
      )
    ) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    const maxRefundable = Number(payment.amount);
    if (amount <= 0 || amount > maxRefundable) {
      throw new BadRequestException(`Refund amount must be between 0 and ${maxRefundable}`);
    }

    if (!this.isMockMode && payment.razorpayPaymentId) {
      await this.razorpay!.payments.refund(payment.razorpayPaymentId, {
        amount: Math.round(amount * 100),
      });
    }

    const isFullRefund = amount >= maxRefundable;
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        refundedAt: new Date(),
        metadata: {
          ...(typeof payment.metadata === 'object' && payment.metadata !== null
            ? (payment.metadata as Record<string, unknown>)
            : {}),
          refundAmount: amount,
          refundReason: reason,
        } as Prisma.InputJsonValue,
      },
    });

    if (isFullRefund) {
      await this.revenueOrchestrator.onPaymentRefunded(paymentId);
    }

    return this.formatPaymentRecord(updated);
  }

  async verifyPayment(
    userId: string,
    paymentId: string,
    razorpayOrderId: string,
    razorpayPaymentId?: string,
    razorpaySignature?: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.PAID) {
      return { success: true, payment, entity: await this.getEntity(payment) };
    }

    if (!this.isMockMode) {
      if (!razorpayPaymentId || !razorpaySignature) {
        throw new BadRequestException('Razorpay payment ID and signature required');
      }

      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest('hex');

      const sigBuffer = Buffer.from(razorpaySignature);
      const expectedBuffer = Buffer.from(expected);
      if (
        sigBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        throw new BadRequestException('Invalid payment signature');
      }
    }

    const updated = await this.completePayment(paymentId, userId, razorpayPaymentId);

    return {
      success: true,
      payment: updated,
      entity: await this.getEntity(updated),
    };
  }

  async mockComplete(userId: string, paymentId: string) {
    if (!this.isMockMode) {
      throw new BadRequestException('Mock payments only available in mock mode');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.PAID) {
      return { success: true, payment, entity: await this.getEntity(payment) };
    }

    const updated = await this.completePayment(paymentId, userId, `mock_pay_${paymentId}`);

    return {
      success: true,
      payment: updated,
      entity: await this.getEntity(updated),
    };
  }

  async refundBookingPayment(bookingId: string, amount: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        entityType: PaymentEntityType.BOOKING,
        entityId: bookingId,
        status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) return null;

    await this.queueJobs.enqueueRefund({
      paymentId: payment.id,
      amount,
      reason: 'Booking cancellation refund',
      bookingId,
    });

    return { queued: true, paymentId: payment.id, amount };
  }

  async retryPayment(paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status === PaymentStatus.PAID) {
      return { skipped: true, reason: 'Already paid' };
    }

    if (this.isMockMode && payment.status === PaymentStatus.PENDING) {
      await this.mockComplete(payment.userId, payment.id);
      return { retried: true };
    }

    if (!this.isMockMode && payment.razorpayOrderId && this.razorpay) {
      const order = await this.razorpay.orders.fetch(payment.razorpayOrderId);
      if (order.status === 'paid') {
        await this.completePayment(payment.id, payment.userId, payment.razorpayOrderId);
        return { retried: true };
      }
    }

    return { retried: false, reason: 'Payment not recoverable' };
  }

  async retryFailedPayments() {
    const failed = await this.prisma.payment.findMany({
      where: {
        deletedAt: null,
        status: { in: [PaymentStatus.FAILED, PaymentStatus.PENDING] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    let retried = 0;
    let recovered = 0;

    for (const payment of failed) {
      retried++;
      const result = await this.retryPayment(payment.id);
      if (result.retried) recovered++;
    }

    return { checked: failed.length, retried, recovered };
  }

  async handleWebhook(signature: string | undefined, rawBody: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const requireSignature =
      Boolean(secret) || (!this.isMockMode && process.env.PAYMENT_MODE === 'live');

    if (requireSignature) {
      if (!secret) {
        throw new BadRequestException('Webhook secret not configured');
      }
      if (!signature) {
        throw new UnauthorizedException('Missing webhook signature');
      }

      const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);
      if (
        sigBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const event = payload.event as string | undefined;
    const eventId =
      (payload.event_id as string | undefined) ??
      (typeof payload.id === 'string' ? payload.id : undefined) ??
      `rzp_${event}_${(payload.created_at as number | undefined) ?? Date.now()}`;

    const webhookRecord = await this.revenueOrchestrator.recordWebhookEvent({
      provider: 'razorpay',
      eventId,
      eventType: event ?? 'unknown',
      payload,
    });
    if (webhookRecord.duplicate) {
      return { received: true, duplicate: true };
    }

    try {
      const paymentEntity = (payload.payload as { payment?: { entity?: Record<string, string> } })
        ?.payment?.entity;

      if (event === 'payment.captured' && paymentEntity?.order_id) {
        const payment = await this.prisma.payment.findFirst({
          where: { razorpayOrderId: paymentEntity.order_id },
        });

        if (payment && payment.status !== PaymentStatus.PAID) {
          await this.completePayment(payment.id, payment.userId, paymentEntity.id);
        }
      }

      if (event === 'payment.failed' && paymentEntity?.order_id) {
        const failedPayment = await this.prisma.payment.findFirst({
          where: { razorpayOrderId: paymentEntity.order_id },
        });
        await this.prisma.payment.updateMany({
          where: { razorpayOrderId: paymentEntity.order_id, status: PaymentStatus.PENDING },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: paymentEntity.error_description ?? 'Payment failed',
          },
        });
        if (failedPayment) {
          await this.notificationsService.notifyPaymentFailed(
            failedPayment.userId,
            Number(failedPayment.amount),
            failedPayment.entityType,
            paymentEntity.error_description,
          );
        }
      }

      if (event === 'refund.processed') {
        const refundEntity = (payload.payload as { refund?: { entity?: Record<string, string> } })
          ?.refund?.entity;
        const razorpayPaymentId = refundEntity?.payment_id;
        if (razorpayPaymentId) {
          const refunded = await this.prisma.payment.findFirst({
            where: { razorpayPaymentId },
          });
          await this.prisma.payment.updateMany({
            where: { razorpayPaymentId },
            data: {
              status: PaymentStatus.REFUNDED,
              refundedAt: new Date(),
            },
          });
          if (refunded) {
            await this.revenueOrchestrator.onPaymentRefunded(refunded.id);
          }
        }
      }

      await this.revenueOrchestrator.markWebhookProcessed(
        webhookRecord.id,
        WebhookEventStatus.PROCESSED,
      );
    } catch (err) {
      await this.revenueOrchestrator.markWebhookProcessed(
        webhookRecord.id,
        WebhookEventStatus.FAILED,
        err instanceof Error ? err.message : 'Webhook processing failed',
      );
      throw err;
    }

    return { received: true };
  }

  private async completePayment(paymentId: string, userId: string, razorpayPaymentId?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.PAID) return payment;

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        razorpayPaymentId: razorpayPaymentId ?? payment.razorpayPaymentId,
        paidAt: new Date(),
      },
    });

    let courtId: string | null = null;

    switch (payment.entityType) {
      case PaymentEntityType.BOOKING: {
        await this.bookingsService.confirmAfterPayment(payment.entityId);
        const booking = await this.prisma.booking.findUnique({
          where: { id: payment.entityId },
          select: { courtId: true },
        });
        courtId = booking?.courtId ?? null;
        break;
      }
      case PaymentEntityType.MEMBERSHIP: {
        const membership = await this.confirmMembership(payment.entityId);
        courtId = membership.plan.courtId;
        break;
      }
      case PaymentEntityType.TRAINING: {
        await this.confirmTrainingEnrollment(payment.entityId);
        const enrollment = await this.prisma.trainingEnrollment.findUnique({
          where: { id: payment.entityId },
          select: { batch: { select: { program: { select: { courtId: true } } } } },
        });
        courtId = enrollment?.batch.program.courtId ?? null;
        break;
      }
      case PaymentEntityType.SHOP_ORDER:
        await this.confirmShopOrder(payment.entityId);
        break;
      case PaymentEntityType.SERVICE_ORDER:
        await this.confirmServiceOrder(payment.entityId);
        break;
      case PaymentEntityType.PRINT_ORDER:
        await this.confirmPrintOrder(payment.entityId);
        break;
      case PaymentEntityType.WALLET_TOPUP:
        await this.walletService.creditFromTopup(
          payment.entityId,
          Number(updated.amount),
          payment.id,
        );
        break;
    }

    await this.notificationsService.notifyPaymentSuccess(
      userId,
      Number(updated.amount),
      payment.entityType,
    );

    await this.createPaymentInvoice(updated);

    await this.revenueOrchestrator.onPaymentCompleted({
      paymentId: updated.id,
      userId,
      entityType: payment.entityType,
      entityId: payment.entityId,
      amount: Number(updated.amount),
      tenantId: payment.tenantId,
    });

    await this.events.emitPaymentUpdated({
      paymentId: updated.id,
      userId,
      courtId,
      status: PaymentStatus.PAID,
      amount: Number(updated.amount),
    });

    return updated;
  }

  private async createPaymentInvoice(payment: {
    id: string;
    userId: string;
    entityType: PaymentEntityType;
    entityId: string;
    amount: Prisma.Decimal;
  }) {
    if (payment.entityType === PaymentEntityType.SHOP_ORDER) return;

    const existing = await this.prisma.paymentInvoice.findUnique({
      where: { paymentId: payment.id },
    });
    if (existing) return existing;

    const description = await this.buildInvoiceDescription(payment.entityType, payment.entityId);

    return this.prisma.paymentInvoice.create({
      data: {
        paymentId: payment.id,
        invoiceNumber: generatePaymentInvoiceNumber(payment.id),
        userId: payment.userId,
        entityType: payment.entityType,
        entityId: payment.entityId,
        subtotal: payment.amount,
        tax: 0,
        total: payment.amount,
        description,
        lineItems: [{ description, amount: Number(payment.amount) }],
      },
    });
  }

  private async buildInvoiceDescription(entityType: PaymentEntityType, entityId: string) {
    switch (entityType) {
      case PaymentEntityType.BOOKING: {
        const booking = await this.prisma.booking.findUnique({
          where: { id: entityId },
          include: { court: { select: { name: true } }, slot: { select: { startTime: true } } },
        });
        return booking
          ? `Court booking — ${booking.court.name} (${booking.slot.startTime.toISOString().slice(0, 10)})`
          : PAYMENT_ENTITY_LABELS[entityType];
      }
      case PaymentEntityType.MEMBERSHIP: {
        const purchase = await this.prisma.membershipPurchase.findUnique({
          where: { id: entityId },
          include: { plan: { select: { name: true } } },
        });
        return purchase ? `Membership — ${purchase.plan.name}` : PAYMENT_ENTITY_LABELS[entityType];
      }
      case PaymentEntityType.TRAINING: {
        const enrollment = await this.prisma.trainingEnrollment.findUnique({
          where: { id: entityId },
          include: { batch: { include: { program: { select: { name: true } } } } },
        });
        return enrollment
          ? `Training — ${enrollment.batch.program.name}`
          : PAYMENT_ENTITY_LABELS[entityType];
      }
      case PaymentEntityType.SERVICE_ORDER: {
        const order = await this.prisma.serviceOrder.findUnique({
          where: { id: entityId },
          include: { listing: { select: { title: true } } },
        });
        return order ? `Service — ${order.listing.title}` : PAYMENT_ENTITY_LABELS[entityType];
      }
      case PaymentEntityType.PRINT_ORDER: {
        const order = await this.prisma.printOrder.findUnique({
          where: { id: entityId },
          include: { listing: { select: { title: true } } },
        });
        return order ? `Print order — ${order.listing.title}` : PAYMENT_ENTITY_LABELS[entityType];
      }
      default:
        return PAYMENT_ENTITY_LABELS[entityType];
    }
  }

  private async confirmMembership(purchaseId: string) {
    const purchase = await this.prisma.membershipPurchase.findUnique({
      where: { id: purchaseId },
      include: { plan: true },
    });

    if (!purchase) throw new NotFoundException('Membership purchase not found');

    const startDate = new Date();
    const endDate = addMembershipDuration(startDate, purchase.plan.duration);

    const updated = await this.prisma.membershipPurchase.update({
      where: { id: purchaseId },
      data: {
        isActive: true,
        paymentStatus: PaymentStatus.PAID,
        startDate,
        endDate,
        amountPaid: purchase.amountPaid,
      },
      include: { plan: true },
    });

    await this.notificationsService.notifyMembershipActivated(updated.userId, {
      purchaseId: updated.id,
      planName: updated.plan.name,
      endDate: endDate.toISOString().slice(0, 10),
    });

    await this.events.emitMembershipUpdated({
      membershipId: updated.id,
      userId: updated.userId,
      courtId: updated.plan.courtId,
      status: 'ACTIVE',
    });

    return updated;
  }

  private async confirmTrainingEnrollment(enrollmentId: string) {
    return this.trainingService.confirmAfterPayment(enrollmentId);
  }

  private async confirmShopOrder(orderId: string) {
    return this.shopService.confirmAfterPayment(orderId);
  }

  private async confirmServiceOrder(orderId: string) {
    return this.servicesService.confirmAfterPayment(orderId);
  }

  private async confirmPrintOrder(orderId: string) {
    return this.printService.confirmAfterPayment(orderId);
  }

  private async getEntity(payment: { entityType: PaymentEntityType; entityId: string }) {
    switch (payment.entityType) {
      case PaymentEntityType.BOOKING:
        return this.prisma.booking.findUnique({
          where: { id: payment.entityId },
          include: {
            court: {
              select: {
                id: true,
                name: true,
                city: true,
                sport: { select: { id: true, name: true, slug: true } },
              },
            },
            slot: { select: { id: true, startTime: true, endTime: true, price: true } },
          },
        });
      case PaymentEntityType.MEMBERSHIP:
        return this.prisma.membershipPurchase.findUnique({
          where: { id: payment.entityId },
          include: { plan: { include: { court: true } } },
        });
      case PaymentEntityType.TRAINING:
        return this.prisma.trainingEnrollment.findUnique({
          where: { id: payment.entityId },
          include: {
            kid: true,
            batch: {
              include: {
                program: { include: { court: true, sport: true } },
                trainer: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        });
      case PaymentEntityType.SHOP_ORDER:
        return this.prisma.shopOrder.findUnique({
          where: { id: payment.entityId },
          include: { items: true },
        });
      case PaymentEntityType.SERVICE_ORDER:
        return this.prisma.serviceOrder.findUnique({
          where: { id: payment.entityId },
          include: { listing: true },
        });
      case PaymentEntityType.PRINT_ORDER:
        return this.prisma.printOrder.findUnique({
          where: { id: payment.entityId },
        });
      case PaymentEntityType.WALLET_TOPUP:
        return this.prisma.wallet.findUnique({ where: { id: payment.entityId } });
      default:
        return null;
    }
  }

  private formatPaymentResponse(payment: {
    id: string;
    amount: Prisma.Decimal;
    razorpayOrderId: string | null;
    entityType?: PaymentEntityType;
    entityId?: string;
  }) {
    return {
      paymentId: payment.id,
      orderId: payment.razorpayOrderId ?? `mock_order_${payment.id}`,
      amount: Number(payment.amount) * 100,
      currency: 'INR',
      keyId: this.isMockMode ? 'mock_key' : process.env.RAZORPAY_KEY_ID,
      mockMode: this.isMockMode,
      isMock: this.isMockMode,
      entityType: payment.entityType,
      entityId: payment.entityId,
    };
  }

  private formatPaymentRecord(payment: Record<string, unknown>) {
    const p = payment as {
      id: string;
      userId: string;
      amount: { toString(): string } | number | string;
      currency: string;
      status: PaymentStatus;
      entityType: PaymentEntityType;
      entityId: string;
      razorpayOrderId: string | null;
      razorpayPaymentId: string | null;
      failureReason: string | null;
      paidAt: Date | null;
      refundedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      invoice?: { invoiceNumber: string } | null;
      user?: unknown;
    };
    return {
      id: p.id,
      userId: p.userId,
      amount: String(p.amount),
      currency: p.currency,
      status: p.status,
      entityType: p.entityType,
      entityLabel: PAYMENT_ENTITY_LABELS[p.entityType],
      entityId: p.entityId,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      failureReason: p.failureReason,
      paidAt: p.paidAt?.toISOString() ?? null,
      refundedAt: p.refundedAt?.toISOString() ?? null,
      invoiceNumber: p.invoice?.invoiceNumber ?? null,
      user: p.user,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private formatInvoice(invoice: {
    id: string;
    paymentId: string;
    invoiceNumber: string;
    entityType: PaymentEntityType;
    entityId: string;
    subtotal: Prisma.Decimal;
    tax: Prisma.Decimal;
    total: Prisma.Decimal;
    description: string | null;
    lineItems: Prisma.JsonValue;
    issuedAt: Date;
  }) {
    return {
      id: invoice.id,
      paymentId: invoice.paymentId,
      invoiceNumber: invoice.invoiceNumber,
      entityType: invoice.entityType,
      entityLabel: PAYMENT_ENTITY_LABELS[invoice.entityType],
      entityId: invoice.entityId,
      subtotal: String(invoice.subtotal),
      tax: String(invoice.tax),
      total: String(invoice.total),
      description: invoice.description,
      lineItems: invoice.lineItems,
      issuedAt: invoice.issuedAt.toISOString(),
    };
  }
}
