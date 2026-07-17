import { Injectable } from '@nestjs/common';
import { OwnerSubscriptionStatus, PaymentStatus, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { toNumber } from '../money.util';

@Injectable()
export class RevenueAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformReport(from?: Date, to?: Date) {
    const start = from ?? new Date(new Date().setHours(0, 0, 0, 0));
    const end = to ?? new Date();

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { gte: start, lte: end },
        deletedAt: null,
      },
      select: { amount: true, entityType: true },
    });

    const gmv = payments.reduce((s, p) => s + toNumber(p.amount), 0);
    const commissions = await this.prisma.commission.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'POSTED' },
    });
    const platformCommission = commissions.reduce((s, c) => s + toNumber(c.commissionAmount), 0);

    const subscriptionRevenue = await this.prisma.ownerSubscription.aggregate({
      where: {
        status: {
          in: [
            OwnerSubscriptionStatus.ACTIVE,
            OwnerSubscriptionStatus.EXPIRED,
            OwnerSubscriptionStatus.GRACE,
          ],
        },
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    const activeOwners = await this.prisma.ownerSubscription.count({
      where: { status: { in: [OwnerSubscriptionStatus.ACTIVE, OwnerSubscriptionStatus.GRACE] } },
    });

    const pendingSettlements = await this.prisma.settlement.count({
      where: { status: { in: [SettlementStatus.PENDING, SettlementStatus.PROCESSING] } },
    });

    const failedPayouts = await this.prisma.payout.count({
      where: { status: 'FAILED' },
    });

    const byEntity: Record<string, number> = {};
    for (const p of payments) {
      byEntity[p.entityType] = (byEntity[p.entityType] ?? 0) + toNumber(p.amount);
    }

    return {
      period: { from: start.toISOString(), to: end.toISOString() },
      gmv: Math.round(gmv * 100) / 100,
      platformCommission: Math.round(platformCommission * 100) / 100,
      subscriptionRevenue: toNumber(subscriptionRevenue._sum.amount),
      platformRevenue:
        Math.round((platformCommission + toNumber(subscriptionRevenue._sum.amount)) * 100) / 100,
      activeOwners,
      pendingSettlements,
      failedPayouts,
      gmvByEntity: byEntity,
      paymentCount: payments.length,
    };
  }

  async getOwnerRevenue(userId: string, from?: Date, to?: Date) {
    const start = from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ?? new Date();

    const wallets = await this.prisma.merchantWallet.findMany({
      where: { ownerUserId: userId },
    });

    const commissions = await this.prisma.commission.findMany({
      where: {
        beneficiaryUserId: userId,
        createdAt: { gte: start, lte: end },
        status: 'POSTED',
      },
    });

    const gross = commissions.reduce((s, c) => s + toNumber(c.grossAmount), 0);
    const commission = commissions.reduce((s, c) => s + toNumber(c.commissionAmount), 0);
    const net = commissions.reduce((s, c) => s + toNumber(c.netAmount), 0);

    const nextSettlement = await this.prisma.settlement.findFirst({
      where: {
        beneficiaryUserId: userId,
        status: { in: [SettlementStatus.PENDING, SettlementStatus.PROCESSING] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const wallet = wallets[0];
    return {
      period: { from: start.toISOString(), to: end.toISOString() },
      revenue: Math.round(gross * 100) / 100,
      commission: Math.round(commission * 100) / 100,
      net: Math.round(net * 100) / 100,
      pending: wallet ? toNumber(wallet.pending) : 0,
      available: wallet ? toNumber(wallet.available) : 0,
      settled: wallet ? toNumber(wallet.lifetimePaidOut) : 0,
      nextSettlementDate: nextSettlement?.scheduledAt?.toISOString() ?? null,
      wallets: wallets.map((w) => ({
        role: w.role,
        pending: toNumber(w.pending),
        available: toNumber(w.available),
        settled: toNumber(w.lifetimePaidOut),
      })),
    };
  }
}
