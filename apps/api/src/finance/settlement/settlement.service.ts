import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  FinanceInvoiceType,
  LedgerEntryType,
  MerchantWalletRole,
  PayoutStatus,
  SettlementStatus,
} from '@prisma/client';
import { AuditAction } from '@prisma/client';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { PrismaService } from '../../prisma/prisma.module';
import { LEDGER_ACCOUNTS } from '../finance.constants';
import { FinanceInvoiceService } from '../invoice/finance-invoice.service';
import { LedgerService } from '../ledger/ledger.service';
import { round2, toNumber } from '../money.util';
import { MerchantWalletService } from '../wallet/merchant-wallet.service';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantWallets: MerchantWalletService,
    private readonly ledger: LedgerService,
    private readonly invoices: FinanceInvoiceService,
    private readonly audit: AuditLogService,
  ) {}

  async listSettlements(params: {
    userId?: string;
    isAdmin?: boolean;
    status?: SettlementStatus;
    limit?: number;
  }) {
    const items = await this.prisma.settlement.findMany({
      where: {
        ...(params.isAdmin ? {} : { beneficiaryUserId: params.userId }),
        ...(params.status ? { status: params.status } : {}),
      },
      include: {
        lines: true,
        payouts: { orderBy: { createdAt: 'desc' }, take: 1 },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
    });

    return items.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      beneficiaryUserId: s.beneficiaryUserId,
      periodStart: s.periodStart.toISOString(),
      periodEnd: s.periodEnd.toISOString(),
      gross: toNumber(s.gross),
      commission: toNumber(s.commission),
      refunds: toNumber(s.refunds),
      adjustments: toNumber(s.adjustments),
      net: toNumber(s.net),
      status: s.status,
      scheduledAt: s.scheduledAt?.toISOString() ?? null,
      paidAt: s.paidAt?.toISOString() ?? null,
      payoutStatus: s.payouts[0]?.status ?? null,
      invoiceNumber: s.invoice?.invoiceNumber ?? null,
      lineCount: s.lines.length,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  /**
   * Weekly settlement: for each merchant wallet with pending > 0 (non-platform, non-receivable path),
   * create settlement + payout and clear pending via ledger.
   */
  async processDueSettlements(actorId?: string) {
    const wallets = await this.prisma.merchantWallet.findMany({
      where: {
        role: { not: MerchantWalletRole.PLATFORM },
        pending: { gt: 0 },
      },
    });

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);

    const results: Array<{ settlementId: string; payoutId: string; net: number }> = [];

    for (const wallet of wallets) {
      const pending = toNumber(wallet.pending);
      if (pending < 1) continue;

      // Estimate commission from recent commissions for reporting
      const commissions = await this.prisma.commission.findMany({
        where: {
          beneficiaryUserId: wallet.ownerUserId,
          isReceivable: false,
          status: 'POSTED',
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      });
      const gross = round2(commissions.reduce((s, c) => s + toNumber(c.grossAmount), 0)) || pending;
      const commission = round2(commissions.reduce((s, c) => s + toNumber(c.commissionAmount), 0));
      const net = pending;

      const settlement = await this.prisma.$transaction(async (tx) => {
        const created = await tx.settlement.create({
          data: {
            tenantId: wallet.tenantId,
            beneficiaryUserId: wallet.ownerUserId,
            periodStart,
            periodEnd,
            gross,
            commission,
            refunds: 0,
            adjustments: 0,
            net,
            status: SettlementStatus.PROCESSING,
            scheduledAt: periodEnd,
            lines: {
              create: commissions.slice(0, 100).map((c) => ({
                paymentId: c.paymentId,
                commissionId: c.id,
                amount: toNumber(c.netAmount),
                description: `${c.serviceType} net`,
              })),
            },
          },
        });

        await this.merchantWallets.settlePending(wallet.id, net, tx);

        await this.ledger.postJournal({
          idempotencyKey: `settlement:${created.id}`,
          referenceType: 'SETTLEMENT',
          referenceId: created.id,
          memo: `Settlement payout ${net}`,
          tx,
          lines: [
            {
              accountCode: LEDGER_ACCOUNTS.OWNER_PAYABLE,
              debit: net,
              entryType: LedgerEntryType.SETTLEMENT,
              walletId: wallet.id,
            },
            {
              accountCode: LEDGER_ACCOUNTS.CASH_RAZORPAY,
              credit: net,
              entryType: LedgerEntryType.PAYOUT,
            },
          ],
        });

        const payout = await tx.payout.create({
          data: {
            settlementId: created.id,
            amount: net,
            status: PayoutStatus.QUEUED,
          },
        });

        return { settlement: created, payout };
      });

      // Mock payout success (live RazorpayX behind future flag)
      await this.completePayoutMock(
        settlement.payout.id,
        settlement.settlement.id,
        wallet.ownerUserId,
      );

      results.push({
        settlementId: settlement.settlement.id,
        payoutId: settlement.payout.id,
        net,
      });
    }

    if (actorId) {
      await this.audit.log({
        action: AuditAction.SETTLEMENT,
        entityType: 'SettlementBatch',
        actorId,
        after: { count: results.length, total: results.reduce((s, r) => s + r.net, 0) },
      });
    }

    this.logger.log(`Processed ${results.length} settlements`);
    return { processed: results.length, settlements: results };
  }

  private async completePayoutMock(payoutId: string, settlementId: string, partyUserId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.SUCCESS,
          processedAt: new Date(),
          attempts: { increment: 1 },
          razorpayPayoutId: `mock_payout_${payoutId.slice(0, 8)}`,
        },
      });
      await tx.settlement.update({
        where: { id: settlementId },
        data: { status: SettlementStatus.PAID, paidAt: new Date() },
      });
    });

    const settlement = await this.prisma.settlement.findUniqueOrThrow({
      where: { id: settlementId },
    });

    await this.invoices.create({
      type: FinanceInvoiceType.SETTLEMENT,
      partyUserId,
      tenantId: settlement.tenantId,
      subtotal: toNumber(settlement.net),
      gst: 0,
      total: toNumber(settlement.net),
      settlementId,
      lineItems: [
        {
          description: 'Partner settlement payout',
          amount: toNumber(settlement.net),
        },
      ],
    });
  }

  async processSettlementById(settlementId: string, actorId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { payouts: true },
    });
    if (!settlement) throw new BadRequestException('Settlement not found');
    if (settlement.status === SettlementStatus.PAID) {
      return { settlementId, status: settlement.status };
    }

    const payout = settlement.payouts[0];
    if (payout) {
      await this.completePayoutMock(payout.id, settlement.id, settlement.beneficiaryUserId);
    } else {
      // Re-run full wallet settlement for this beneficiary only
      const wallet = await this.prisma.merchantWallet.findFirst({
        where: {
          ownerUserId: settlement.beneficiaryUserId,
          role: { not: MerchantWalletRole.PLATFORM },
        },
      });
      if (wallet && toNumber(wallet.pending) > 0) {
        await this.processDueSettlements(actorId);
      }
    }

    await this.audit.log({
      action: AuditAction.PAYOUT,
      entityType: 'Settlement',
      entityId: settlementId,
      actorId,
      after: { status: 'PAID' },
    });

    return { settlementId, status: SettlementStatus.PAID };
  }
}
