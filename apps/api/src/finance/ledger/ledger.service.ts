import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerEntryType, MerchantWalletRole, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { LEDGER_ACCOUNTS } from '../finance.constants';
import { round2, toNumber } from '../money.util';

export type JournalLineInput = {
  accountCode: string;
  debit?: number;
  credit?: number;
  entryType: LedgerEntryType;
  walletId?: string | null;
  meta?: Record<string, unknown>;
};

type TxClient = Prisma.TransactionClient;

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureChartOfAccounts(tx?: TxClient) {
    const db = tx ?? this.prisma;
    const accounts = [
      { code: LEDGER_ACCOUNTS.CASH_RAZORPAY, name: 'Cash — Razorpay', type: 'ASSET' as const },
      { code: LEDGER_ACCOUNTS.OWNER_PAYABLE, name: 'Owner Payable', type: 'LIABILITY' as const },
      {
        code: LEDGER_ACCOUNTS.PLATFORM_COMMISSION,
        name: 'Platform Commission Revenue',
        type: 'REVENUE' as const,
      },
      {
        code: LEDGER_ACCOUNTS.PLATFORM_SUBSCRIPTION,
        name: 'Platform Subscription Revenue',
        type: 'REVENUE' as const,
      },
      { code: LEDGER_ACCOUNTS.GST_PAYABLE, name: 'GST Payable', type: 'LIABILITY' as const },
      {
        code: LEDGER_ACCOUNTS.COMMISSION_RECEIVABLE,
        name: 'Commission Receivable',
        type: 'ASSET' as const,
      },
      { code: LEDGER_ACCOUNTS.REFUNDS, name: 'Refunds Expense', type: 'EXPENSE' as const },
    ];

    for (const account of accounts) {
      await db.ledgerAccount.upsert({
        where: { code: account.code },
        create: account,
        update: { name: account.name, isActive: true },
      });
    }
  }

  async postJournal(params: {
    idempotencyKey: string;
    referenceType: string;
    referenceId: string;
    memo?: string;
    lines: JournalLineInput[];
    tx?: TxClient;
  }) {
    const run = async (tx: TxClient) => {
      const existing = await tx.ledgerTransaction.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
        include: { entries: true },
      });
      if (existing) return existing;

      await this.ensureChartOfAccounts(tx);

      const totalDebit = round2(params.lines.reduce((s, l) => s + (l.debit ?? 0), 0));
      const totalCredit = round2(params.lines.reduce((s, l) => s + (l.credit ?? 0), 0));
      if (totalDebit !== totalCredit) {
        throw new BadRequestException(
          `Unbalanced journal: debit ${totalDebit} != credit ${totalCredit}`,
        );
      }
      if (totalDebit <= 0) {
        throw new BadRequestException('Journal must have positive totals');
      }

      const codes = [...new Set(params.lines.map((l) => l.accountCode))];
      const accounts = await tx.ledgerAccount.findMany({
        where: { code: { in: codes } },
      });
      const byCode = new Map(accounts.map((a) => [a.code, a]));

      for (const code of codes) {
        if (!byCode.has(code)) {
          throw new BadRequestException(`Unknown ledger account: ${code}`);
        }
      }

      const journal = await tx.ledgerTransaction.create({
        data: {
          idempotencyKey: params.idempotencyKey,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          memo: params.memo,
          entries: {
            create: params.lines.map((line) => ({
              accountId: byCode.get(line.accountCode)!.id,
              walletId: line.walletId ?? null,
              debit: round2(line.debit ?? 0),
              credit: round2(line.credit ?? 0),
              entryType: line.entryType,
              meta: (line.meta ?? undefined) as Prisma.InputJsonValue | undefined,
            })),
          },
        },
        include: { entries: true },
      });

      return journal;
    };

    if (params.tx) return run(params.tx);
    return this.prisma.$transaction(run);
  }

  async listEntries(params: {
    userId?: string;
    walletId?: string;
    limit?: number;
    cursor?: string;
  }) {
    const take = Math.min(params.limit ?? 50, 100);
    const wallets = params.userId
      ? await this.prisma.merchantWallet.findMany({
          where: { ownerUserId: params.userId },
          select: { id: true },
        })
      : [];

    const walletIds = params.walletId ? [params.walletId] : wallets.map((w) => w.id);

    if (params.userId && walletIds.length === 0) {
      return { items: [], nextCursor: null };
    }

    const items = await this.prisma.ledgerEntry.findMany({
      where: {
        ...(walletIds.length ? { walletId: { in: walletIds } } : {}),
        ...(params.cursor ? { createdAt: { lt: new Date(params.cursor) } } : {}),
      },
      include: {
        account: true,
        transaction: true,
        wallet: { select: { id: true, role: true, ownerUserId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    });

    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;
    return {
      items: page.map((e) => ({
        id: e.id,
        debit: toNumber(e.debit),
        credit: toNumber(e.credit),
        entryType: e.entryType,
        accountCode: e.account.code,
        accountName: e.account.name,
        memo: e.transaction.memo,
        referenceType: e.transaction.referenceType,
        referenceId: e.transaction.referenceId,
        walletRole: e.wallet?.role as MerchantWalletRole | undefined,
        createdAt: e.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1]?.createdAt.toISOString() : null,
    };
  }
}
