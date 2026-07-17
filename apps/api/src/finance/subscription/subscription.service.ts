import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FinanceInvoiceType,
  LedgerEntryType,
  OwnerSubscriptionStatus,
  PaymentEntityType,
  type Prisma,
} from '@prisma/client';
import { AuditAction } from '@prisma/client';
import type { EnvConfig } from '../../config/env.schema';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { PaymentsService } from '../../payments/payments.service';
import { PrismaService } from '../../prisma/prisma.module';
import {
  GRACE_PERIOD_DAYS,
  GST_RATE,
  LEDGER_ACCOUNTS,
  SUBSCRIPTION_PLANS,
} from '../finance.constants';
import { FinanceInvoiceService } from '../invoice/finance-invoice.service';
import { LedgerService } from '../ledger/ledger.service';
import { addGst, toNumber } from '../money.util';
import { MerchantWalletService } from '../wallet/merchant-wallet.service';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly ledger: LedgerService,
    private readonly merchantWallets: MerchantWalletService,
    private readonly invoices: FinanceInvoiceService,
    private readonly audit: AuditLogService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly payments: PaymentsService,
  ) {}

  async listPlans(): Promise<
    Array<{
      id: string;
      code: string;
      name: string;
      durationDays: number;
      amount: number;
      gstRate: number;
      gst: number;
      total: number;
      features: unknown;
    }>
  > {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (plans.length === 0) {
      await this.seedPlans();
      return this.listPlans();
    }
    return plans.map((p) => {
      const amount = toNumber(p.amount);
      const gstRate = toNumber(p.gstRate) || GST_RATE;
      const { gst, total } = addGst(amount, gstRate);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        durationDays: p.durationDays,
        amount,
        gstRate,
        gst,
        total,
        features: p.features,
      };
    });
  }

  async seedPlans() {
    for (const plan of SUBSCRIPTION_PLANS) {
      await this.prisma.subscriptionPlan.upsert({
        where: { code: plan.code },
        create: {
          code: plan.code,
          name: plan.name,
          durationDays: plan.durationDays,
          amount: plan.amount,
          gstRate: GST_RATE,
          sortOrder: plan.sortOrder,
          features: {
            courts: true,
            bookings: true,
            coaches: true,
            memberships: true,
          },
        },
        update: {
          name: plan.name,
          durationDays: plan.durationDays,
          amount: plan.amount,
          isActive: true,
        },
      });
    }
  }

  async getMySubscription(ownerId: string) {
    const sub = await this.prisma.ownerSubscription.findFirst({
      where: {
        ownerId,
        status: { in: [OwnerSubscriptionStatus.ACTIVE, OwnerSubscriptionStatus.GRACE] },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });
    if (!sub) {
      const latest = await this.prisma.ownerSubscription.findFirst({
        where: { ownerId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
      return latest ? this.format(latest) : null;
    }
    return this.format(sub);
  }

  async purchase(params: {
    ownerId: string;
    planId: string;
    tenantId: string;
    autoRenew?: boolean;
  }) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: params.planId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: params.tenantId, ownerId: params.ownerId, deletedAt: null },
    });
    if (!tenant) throw new ForbiddenException('Tenant not found for owner');

    const amount = toNumber(plan.amount);
    const gstRate = toNumber(plan.gstRate) || GST_RATE;
    const { gst, total } = addGst(amount, gstRate);

    const subscription = await this.prisma.ownerSubscription.create({
      data: {
        ownerId: params.ownerId,
        tenantId: params.tenantId,
        planId: plan.id,
        amount,
        gst,
        total,
        status: OwnerSubscriptionStatus.PENDING_PAYMENT,
        autoRenew: params.autoRenew ?? false,
      },
    });

    // Platform keys only — do not pass tenantId so FitOra collects subscription revenue
    const payment = await this.payments.createPaymentOrder(
      params.ownerId,
      total,
      PaymentEntityType.OWNER_SUBSCRIPTION,
      subscription.id,
      `owner-sub:${subscription.id}`,
    );

    await this.prisma.ownerSubscription.update({
      where: { id: subscription.id },
      data: { paymentId: payment.paymentId },
    });

    await this.audit.log({
      action: AuditAction.SUBSCRIPTION,
      entityType: 'OwnerSubscription',
      entityId: subscription.id,
      actorId: params.ownerId,
      after: { planId: plan.id, total, status: 'PENDING_PAYMENT' },
    });

    return {
      subscription: this.format({
        ...subscription,
        plan,
        paymentId: payment.paymentId,
      }),
      payment,
    };
  }

  async activateAfterPayment(subscriptionId: string, paymentId: string, tx: TxClient) {
    const sub = await tx.ownerSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status === OwnerSubscriptionStatus.ACTIVE && sub.paymentId === paymentId) {
      return sub;
    }

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + sub.plan.durationDays);
    const graceEndsAt = new Date(end);
    graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

    const amount = toNumber(sub.amount);
    const gst = toNumber(sub.gst);
    const total = toNumber(sub.total);

    const platformAdmin = await tx.user.findFirst({
      where: {
        roles: { some: { role: 'ADMIN', deletedAt: null } },
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!platformAdmin) throw new BadRequestException('Platform admin missing for wallet');

    const platformWallet = await this.merchantWallets.getPlatformWallet(platformAdmin.id, tx);

    await this.ledger.postJournal({
      idempotencyKey: `subscription:${paymentId}`,
      referenceType: 'OWNER_SUBSCRIPTION',
      referenceId: subscriptionId,
      memo: `Owner subscription ${sub.plan.code}`,
      tx,
      lines: [
        {
          accountCode: LEDGER_ACCOUNTS.CASH_RAZORPAY,
          debit: total,
          entryType: LedgerEntryType.SUBSCRIPTION,
        },
        {
          accountCode: LEDGER_ACCOUNTS.PLATFORM_SUBSCRIPTION,
          credit: amount,
          entryType: LedgerEntryType.SUBSCRIPTION,
          walletId: platformWallet.id,
        },
        {
          accountCode: LEDGER_ACCOUNTS.GST_PAYABLE,
          credit: gst,
          entryType: LedgerEntryType.GST,
        },
      ],
    });

    await this.merchantWallets.creditAvailable(platformWallet.id, amount, tx);

    const invoice = await this.invoices.create(
      {
        type: FinanceInvoiceType.SUBSCRIPTION,
        partyUserId: sub.ownerId,
        tenantId: sub.tenantId,
        subtotal: amount,
        gst,
        total,
        paymentId,
        lineItems: [
          {
            description: `FitOra Owner Plan — ${sub.plan.name}`,
            amount,
            gst,
            total,
          },
        ],
      },
      tx,
    );

    const updated = await tx.ownerSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: OwnerSubscriptionStatus.ACTIVE,
        startDate: start,
        endDate: end,
        graceEndsAt,
        paymentId,
        invoiceId: invoice.id,
      },
      include: { plan: true },
    });

    // Ensure tenant is active for marketplace
    await tx.tenant.update({
      where: { id: sub.tenantId },
      data: { isActive: true },
    });

    return updated;
  }

  async assertTenantCanAcceptBookings(tenantId: string) {
    if (!this.config.get('SUBSCRIPTION_GATE_ENABLED')) return;

    const active = await this.prisma.ownerSubscription.findFirst({
      where: {
        tenantId,
        status: { in: [OwnerSubscriptionStatus.ACTIVE, OwnerSubscriptionStatus.GRACE] },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
          { graceEndsAt: { gte: new Date() } },
        ],
      },
    });
    if (!active) {
      throw new ForbiddenException('Owner subscription expired. Renew to accept new bookings.');
    }
  }

  async processExpiries() {
    const now = new Date();
    const warnAt7 = new Date(now);
    warnAt7.setDate(warnAt7.getDate() + 7);
    const warnAt3 = new Date(now);
    warnAt3.setDate(warnAt3.getDate() + 3);

    const expiring = await this.prisma.ownerSubscription.findMany({
      where: {
        status: OwnerSubscriptionStatus.ACTIVE,
        endDate: { lte: warnAt7, gte: now },
      },
      include: { plan: true, owner: true },
    });

    const expired = await this.prisma.ownerSubscription.findMany({
      where: {
        status: { in: [OwnerSubscriptionStatus.ACTIVE, OwnerSubscriptionStatus.GRACE] },
        OR: [{ graceEndsAt: { lt: now } }, { endDate: { lt: now }, graceEndsAt: null }],
      },
    });

    for (const sub of expired) {
      await this.prisma.ownerSubscription.update({
        where: { id: sub.id },
        data: { status: OwnerSubscriptionStatus.EXPIRED },
      });
      // Hide courts from marketplace but keep existing bookings
      await this.prisma.court.updateMany({
        where: { tenantId: sub.tenantId, deletedAt: null },
        data: { isActive: false },
      });
    }

    // Move ACTIVE past endDate into GRACE
    await this.prisma.ownerSubscription.updateMany({
      where: {
        status: OwnerSubscriptionStatus.ACTIVE,
        endDate: { lt: now },
        graceEndsAt: { gte: now },
      },
      data: { status: OwnerSubscriptionStatus.GRACE },
    });

    return {
      expiringCount: expiring.length,
      expiredCount: expired.length,
      warnings: expiring.map((s) => ({
        subscriptionId: s.id,
        ownerId: s.ownerId,
        endDate: s.endDate,
        daysLeft: s.endDate ? Math.ceil((s.endDate.getTime() - now.getTime()) / 86400000) : 0,
      })),
    };
  }

  private format(sub: {
    id: string;
    ownerId: string;
    tenantId: string;
    planId: string;
    amount: unknown;
    gst: unknown;
    total: unknown;
    status: OwnerSubscriptionStatus;
    startDate: Date | null;
    endDate: Date | null;
    graceEndsAt: Date | null;
    paymentId: string | null;
    autoRenew: boolean;
    plan?: { code: string; name: string; durationDays: number };
  }) {
    return {
      id: sub.id,
      ownerId: sub.ownerId,
      tenantId: sub.tenantId,
      planId: sub.planId,
      plan: sub.plan
        ? { code: sub.plan.code, name: sub.plan.name, durationDays: sub.plan.durationDays }
        : undefined,
      amount: toNumber(sub.amount),
      gst: toNumber(sub.gst),
      total: toNumber(sub.total),
      status: sub.status,
      startDate: sub.startDate?.toISOString() ?? null,
      endDate: sub.endDate?.toISOString() ?? null,
      graceEndsAt: sub.graceEndsAt?.toISOString() ?? null,
      paymentId: sub.paymentId,
      autoRenew: sub.autoRenew,
      daysRemaining: sub.endDate
        ? Math.max(0, Math.ceil((sub.endDate.getTime() - Date.now()) / 86400000))
        : null,
    };
  }
}
