import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MerchantWalletRole,
  PaymentEntityType,
  Prisma,
  UserRole,
  WebhookEventStatus,
} from '@prisma/client';
import type { EnvConfig } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.module';
import { CommissionEngine } from './commission/commission.engine';
import { SubscriptionService } from './subscription/subscription.service';

/**
 * Orchestrates revenue side-effects after a payment is marked PAID.
 * Called from PaymentsService inside or immediately after confirmation.
 */
@Injectable()
export class RevenueOrchestrator {
  private readonly logger = new Logger(RevenueOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly commissionEngine: CommissionEngine,
    private readonly subscriptions: SubscriptionService,
  ) {}

  isEnabled() {
    return this.config.get('REVENUE_ENGINE_ENABLED') !== false;
  }

  async onPaymentCompleted(params: {
    paymentId: string;
    userId: string;
    entityType: PaymentEntityType;
    entityId: string;
    amount: number;
    tenantId?: string | null;
  }) {
    if (!this.isEnabled()) return null;

    try {
      if (params.entityType === PaymentEntityType.OWNER_SUBSCRIPTION) {
        return this.prisma.$transaction((tx) =>
          this.subscriptions.activateAfterPayment(params.entityId, params.paymentId, tx),
        );
      }

      if (params.entityType === PaymentEntityType.WALLET_TOPUP) {
        return null;
      }

      return this.prisma.$transaction(async (tx) => {
        const beneficiary = await this.resolveBeneficiary(
          params.entityType,
          params.entityId,
          params.tenantId,
          tx,
        );
        if (!beneficiary) {
          this.logger.warn(`No beneficiary for payment ${params.paymentId} (${params.entityType})`);
          return null;
        }

        const tenant = beneficiary.tenantId
          ? await tx.tenant.findUnique({ where: { id: beneficiary.tenantId } })
          : null;

        const platformAdmin = await tx.user.findFirst({
          where: {
            roles: { some: { role: UserRole.ADMIN, deletedAt: null } },
            deletedAt: null,
          },
          orderBy: { createdAt: 'asc' },
        });
        if (!platformAdmin) {
          this.logger.error('No platform admin for merchant wallet');
          return null;
        }

        return this.commissionEngine.splitPayment({
          paymentId: params.paymentId,
          entityType: params.entityType,
          grossAmount: params.amount,
          tenantId: beneficiary.tenantId,
          beneficiaryUserId: beneficiary.userId,
          beneficiaryRole: beneficiary.role,
          useOwnPaymentAccount: tenant?.useOwnPaymentAccount ?? false,
          platformUserId: platformAdmin.id,
          tx,
        });
      });
    } catch (err) {
      this.logger.error(
        `Revenue orchestration failed for payment ${params.paymentId}`,
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async onPaymentRefunded(paymentId: string) {
    if (!this.isEnabled()) return null;
    const platformAdmin = await this.prisma.user.findFirst({
      where: {
        roles: { some: { role: UserRole.ADMIN, deletedAt: null } },
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!platformAdmin) return null;

    return this.prisma.$transaction((tx) =>
      this.commissionEngine.reverseForRefund({
        paymentId,
        platformUserId: platformAdmin.id,
        tx,
      }),
    );
  }

  async recordWebhookEvent(params: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: unknown;
  }): Promise<{ duplicate: boolean; id: string }> {
    try {
      const created = await this.prisma.webhookEvent.create({
        data: {
          provider: params.provider,
          eventId: params.eventId,
          eventType: params.eventType,
          payload: params.payload as Prisma.InputJsonValue,
          status: WebhookEventStatus.RECEIVED,
        },
      });
      return { duplicate: false, id: created.id };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.webhookEvent.findUnique({
          where: { eventId: params.eventId },
        });
        return { duplicate: true, id: existing!.id };
      }
      throw err;
    }
  }

  async markWebhookProcessed(id: string, status: WebhookEventStatus, error?: string) {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status,
        processedAt: new Date(),
        error: error?.slice(0, 500),
      },
    });
  }

  private async resolveBeneficiary(
    entityType: PaymentEntityType,
    entityId: string,
    tenantId: string | null | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<{
    userId: string;
    tenantId: string | null;
    role: MerchantWalletRole;
  } | null> {
    switch (entityType) {
      case PaymentEntityType.BOOKING: {
        const booking = await tx.booking.findUnique({
          where: { id: entityId },
          include: { court: { select: { ownerId: true, tenantId: true } } },
        });
        if (!booking) return null;
        return {
          userId: booking.court.ownerId,
          tenantId: booking.court.tenantId ?? tenantId ?? null,
          role: MerchantWalletRole.COURT_OWNER,
        };
      }
      case PaymentEntityType.MEMBERSHIP: {
        const purchase = await tx.membershipPurchase.findUnique({
          where: { id: entityId },
          include: { plan: { select: { court: { select: { ownerId: true, tenantId: true } } } } },
        });
        if (!purchase?.plan.court) return null;
        return {
          userId: purchase.plan.court.ownerId,
          tenantId: purchase.plan.court.tenantId ?? tenantId ?? null,
          role: MerchantWalletRole.COURT_OWNER,
        };
      }
      case PaymentEntityType.TRAINING: {
        const enrollment = await tx.trainingEnrollment.findUnique({
          where: { id: entityId },
          include: {
            batch: {
              select: {
                program: {
                  select: { court: { select: { ownerId: true, tenantId: true } } },
                },
              },
            },
          },
        });
        const court = enrollment?.batch.program.court;
        if (!court) return null;
        return {
          userId: court.ownerId,
          tenantId: court.tenantId ?? tenantId ?? null,
          role: MerchantWalletRole.COURT_OWNER,
        };
      }
      case PaymentEntityType.SHOP_ORDER: {
        const order = await tx.shopOrder.findUnique({
          where: { id: entityId },
          include: {
            items: {
              take: 1,
              include: { product: { select: { tenantId: true } } },
            },
          },
        });
        const productTenantId = order?.items[0]?.product.tenantId ?? tenantId;
        if (!productTenantId) return null;
        const tenant = await tx.tenant.findUnique({ where: { id: productTenantId } });
        if (!tenant) return null;
        return {
          userId: tenant.ownerId,
          tenantId: tenant.id,
          role: MerchantWalletRole.SHOP,
        };
      }
      case PaymentEntityType.SERVICE_ORDER: {
        const order = await tx.serviceOrder.findUnique({
          where: { id: entityId },
          include: { listing: { select: { tenantId: true, providerId: true } } },
        });
        if (!order) return null;
        return {
          userId: order.providerId,
          tenantId: order.listing.tenantId ?? tenantId ?? null,
          role: MerchantWalletRole.SERVICE_PROVIDER,
        };
      }
      case PaymentEntityType.PRINT_ORDER: {
        const order = await tx.printOrder.findUnique({
          where: { id: entityId },
          include: { listing: { select: { tenantId: true, providerId: true } } },
        });
        if (!order) return null;
        return {
          userId: order.providerId,
          tenantId: order.listing.tenantId ?? tenantId ?? null,
          role: MerchantWalletRole.PRINTER,
        };
      }
      default:
        return null;
    }
  }
}
