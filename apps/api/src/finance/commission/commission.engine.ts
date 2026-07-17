import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CommissionServiceType,
  MerchantWalletRole,
  PaymentEntityType,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  DEFAULT_COMMISSION_RATES,
  LEDGER_ACCOUNTS,
  PAYMENT_TO_COMMISSION,
} from '../finance.constants';
import { LedgerService } from '../ledger/ledger.service';
import { percentOf, round2, toNumber } from '../money.util';
import { MerchantWalletService } from '../wallet/merchant-wallet.service';
import { LedgerEntryType } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

export type CommissionSplitResult = {
  commissionId: string;
  grossAmount: number;
  ratePercent: number;
  commissionAmount: number;
  netAmount: number;
  isReceivable: boolean;
};

@Injectable()
export class CommissionEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly merchantWallets: MerchantWalletService,
  ) {}

  async getActiveRate(
    serviceType: CommissionServiceType,
    tenantId?: string | null,
    tx?: TxClient,
  ): Promise<number> {
    const db = tx ?? this.prisma;
    const now = new Date();
    const tenantRule = tenantId
      ? await db.commissionRule.findFirst({
          where: {
            serviceType,
            tenantId,
            isActive: true,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          },
          orderBy: { effectiveFrom: 'desc' },
        })
      : null;
    if (tenantRule) return toNumber(tenantRule.ratePercent);

    const globalRule = await db.commissionRule.findFirst({
      where: {
        serviceType,
        tenantId: null,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (globalRule) return toNumber(globalRule.ratePercent);

    const fallback = DEFAULT_COMMISSION_RATES[serviceType as keyof typeof DEFAULT_COMMISSION_RATES];
    return fallback ?? 0;
  }

  calculate(grossAmount: number, ratePercent: number) {
    const gross = round2(grossAmount);
    const commissionAmount = percentOf(gross, ratePercent);
    const netAmount = round2(gross - commissionAmount);
    return { grossAmount: gross, ratePercent, commissionAmount, netAmount };
  }

  async listRules() {
    const rules = await this.prisma.commissionRule.findMany({
      where: { isActive: true },
      orderBy: [{ serviceType: 'asc' }, { tenantId: 'asc' }],
    });
    return rules.map((r) => ({
      id: r.id,
      serviceType: r.serviceType,
      ratePercent: toNumber(r.ratePercent),
      flatFee: r.flatFee != null ? toNumber(r.flatFee) : null,
      tenantId: r.tenantId,
      effectiveFrom: r.effectiveFrom.toISOString(),
      effectiveTo: r.effectiveTo?.toISOString() ?? null,
      isActive: r.isActive,
    }));
  }

  async updateRule(
    id: string,
    data: { ratePercent?: number; isActive?: boolean; flatFee?: number | null },
  ) {
    const rule = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Commission rule not found');
    const updated = await this.prisma.commissionRule.update({
      where: { id },
      data: {
        ...(data.ratePercent != null ? { ratePercent: data.ratePercent } : {}),
        ...(data.isActive != null ? { isActive: data.isActive } : {}),
        ...(data.flatFee !== undefined ? { flatFee: data.flatFee } : {}),
      },
    });
    return {
      id: updated.id,
      serviceType: updated.serviceType,
      ratePercent: toNumber(updated.ratePercent),
      isActive: updated.isActive,
    };
  }

  /**
   * Split a successful marketplace payment into platform commission + owner net.
   * Idempotent on paymentId.
   */
  async splitPayment(params: {
    paymentId: string;
    entityType: PaymentEntityType;
    grossAmount: number;
    tenantId?: string | null;
    beneficiaryUserId: string;
    beneficiaryRole: MerchantWalletRole;
    useOwnPaymentAccount: boolean;
    platformUserId: string;
    tx: TxClient;
  }): Promise<CommissionSplitResult | null> {
    const serviceType = PAYMENT_TO_COMMISSION[params.entityType];
    if (!serviceType) return null;

    const existing = await params.tx.commission.findUnique({
      where: { paymentId: params.paymentId },
    });
    if (existing) {
      return {
        commissionId: existing.id,
        grossAmount: toNumber(existing.grossAmount),
        ratePercent: toNumber(existing.ratePercent),
        commissionAmount: toNumber(existing.commissionAmount),
        netAmount: toNumber(existing.netAmount),
        isReceivable: existing.isReceivable,
      };
    }

    const ratePercent = await this.getActiveRate(serviceType, params.tenantId, params.tx);
    const split = this.calculate(params.grossAmount, ratePercent);
    const isReceivable = params.useOwnPaymentAccount;

    const commission = await params.tx.commission.create({
      data: {
        paymentId: params.paymentId,
        serviceType,
        grossAmount: split.grossAmount,
        ratePercent: split.ratePercent,
        commissionAmount: split.commissionAmount,
        netAmount: split.netAmount,
        tenantId: params.tenantId ?? null,
        beneficiaryUserId: params.beneficiaryUserId,
        isReceivable,
        status: 'POSTED',
      },
    });

    const ownerWallet = await this.merchantWallets.getOrCreate(
      params.beneficiaryUserId,
      params.beneficiaryRole,
      params.tenantId,
      params.tx,
    );
    const platformWallet = await this.merchantWallets.getPlatformWallet(
      params.platformUserId,
      params.tx,
    );

    if (isReceivable) {
      // Money never hit platform — record receivable + owner gross liability note
      await this.ledger.postJournal({
        idempotencyKey: `commission:${params.paymentId}`,
        referenceType: 'PAYMENT',
        referenceId: params.paymentId,
        memo: `Commission receivable ${serviceType} ${split.commissionAmount}`,
        tx: params.tx,
        lines: [
          {
            accountCode: LEDGER_ACCOUNTS.COMMISSION_RECEIVABLE,
            debit: split.commissionAmount,
            entryType: LedgerEntryType.RECEIVABLE,
            walletId: platformWallet.id,
          },
          {
            accountCode: LEDGER_ACCOUNTS.PLATFORM_COMMISSION,
            credit: split.commissionAmount,
            entryType: LedgerEntryType.COMMISSION,
            walletId: platformWallet.id,
          },
        ],
      });
      await this.merchantWallets.creditAvailable(
        platformWallet.id,
        0, // receivable tracked in ledger; don't inflate available cash
        params.tx,
      );
      // Still track owner earning locally for reporting (pending not settleable via platform)
      await this.merchantWallets.creditPending(ownerWallet.id, split.netAmount, params.tx);
    } else {
      await this.ledger.postJournal({
        idempotencyKey: `commission:${params.paymentId}`,
        referenceType: 'PAYMENT',
        referenceId: params.paymentId,
        memo: `Split ${serviceType} gross ${split.grossAmount}`,
        tx: params.tx,
        lines: [
          {
            accountCode: LEDGER_ACCOUNTS.CASH_RAZORPAY,
            debit: split.grossAmount,
            entryType: LedgerEntryType.PLATFORM_REVENUE,
          },
          {
            accountCode: LEDGER_ACCOUNTS.OWNER_PAYABLE,
            credit: split.netAmount,
            entryType: LedgerEntryType.OWNER_EARNING,
            walletId: ownerWallet.id,
          },
          {
            accountCode: LEDGER_ACCOUNTS.PLATFORM_COMMISSION,
            credit: split.commissionAmount,
            entryType: LedgerEntryType.COMMISSION,
            walletId: platformWallet.id,
          },
        ],
      });
      await this.merchantWallets.creditPending(ownerWallet.id, split.netAmount, params.tx);
      await this.merchantWallets.creditAvailable(
        platformWallet.id,
        split.commissionAmount,
        params.tx,
      );
    }

    return {
      commissionId: commission.id,
      ...split,
      isReceivable,
    };
  }

  async reverseForRefund(params: { paymentId: string; platformUserId: string; tx: TxClient }) {
    const commission = await params.tx.commission.findUnique({
      where: { paymentId: params.paymentId },
    });
    if (!commission || commission.status === 'REVERSED') return null;

    const net = toNumber(commission.netAmount);
    const fee = toNumber(commission.commissionAmount);
    const gross = toNumber(commission.grossAmount);

    if (commission.beneficiaryUserId) {
      const role = await this.inferRole(commission.beneficiaryUserId, params.tx);
      const ownerWallet = await this.merchantWallets.getOrCreate(
        commission.beneficiaryUserId,
        role,
        commission.tenantId,
        params.tx,
      );
      await this.merchantWallets.debitPending(ownerWallet.id, net, params.tx);
    }

    const platformWallet = await this.merchantWallets.getPlatformWallet(
      params.platformUserId,
      params.tx,
    );
    if (!commission.isReceivable && fee > 0) {
      await this.merchantWallets.debitPending(platformWallet.id, 0, params.tx);
      // Reduce available commission revenue
      await params.tx.$executeRaw`
        SELECT id FROM merchant_wallets WHERE id = ${platformWallet.id}::uuid FOR UPDATE
      `;
      await params.tx.merchantWallet.update({
        where: { id: platformWallet.id },
        data: { available: { decrement: fee } },
      });
    }

    await this.ledger.postJournal({
      idempotencyKey: `commission-refund:${params.paymentId}`,
      referenceType: 'PAYMENT_REFUND',
      referenceId: params.paymentId,
      memo: `Reverse commission for payment ${params.paymentId}`,
      tx: params.tx,
      lines: commission.isReceivable
        ? [
            {
              accountCode: LEDGER_ACCOUNTS.PLATFORM_COMMISSION,
              debit: fee,
              entryType: LedgerEntryType.REFUND,
              walletId: platformWallet.id,
            },
            {
              accountCode: LEDGER_ACCOUNTS.COMMISSION_RECEIVABLE,
              credit: fee,
              entryType: LedgerEntryType.REFUND,
              walletId: platformWallet.id,
            },
          ]
        : [
            {
              accountCode: LEDGER_ACCOUNTS.OWNER_PAYABLE,
              debit: net,
              entryType: LedgerEntryType.REFUND,
            },
            {
              accountCode: LEDGER_ACCOUNTS.PLATFORM_COMMISSION,
              debit: fee,
              entryType: LedgerEntryType.REFUND,
              walletId: platformWallet.id,
            },
            {
              accountCode: LEDGER_ACCOUNTS.CASH_RAZORPAY,
              credit: gross,
              entryType: LedgerEntryType.REFUND,
            },
          ],
    });

    await params.tx.commission.update({
      where: { id: commission.id },
      data: { status: 'REVERSED' },
    });

    return commission;
  }

  private async inferRole(userId: string, tx: TxClient): Promise<MerchantWalletRole> {
    const roles = await tx.userRoleAssignment.findMany({
      where: { userId, deletedAt: null },
      select: { role: true },
    });
    const set = new Set(roles.map((r) => r.role));
    if (set.has('COURT_OWNER')) return MerchantWalletRole.COURT_OWNER;
    if (set.has('SERVICE_PROVIDER')) return MerchantWalletRole.SERVICE_PROVIDER;
    if (set.has('PRINTER')) return MerchantWalletRole.PRINTER;
    return MerchantWalletRole.SHOP;
  }
}
