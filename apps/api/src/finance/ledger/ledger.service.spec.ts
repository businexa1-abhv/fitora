import { BadRequestException } from '@nestjs/common';
import { LedgerEntryType } from '@prisma/client';
import { LedgerService } from './ledger.service';

describe('LedgerService.postJournal validation', () => {
  const prisma: {
    ledgerTransaction: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    ledgerAccount: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    $transaction: jest.Mock;
  } = {
    ledgerTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    ledgerAccount: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };

  const service = new LedgerService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    prisma.ledgerAccount.upsert.mockResolvedValue({});
    prisma.ledgerAccount.findMany.mockResolvedValue([
      { id: 'a1', code: 'CASH_RAZORPAY' },
      { id: 'a2', code: 'PLATFORM_COMMISSION' },
    ]);
    prisma.ledgerTransaction.create.mockImplementation(async ({ data }: { data: unknown }) => ({
      id: 'tx1',
      ...(data as object),
      entries: [],
    }));
  });

  it('rejects unbalanced journals', async () => {
    await expect(
      service.postJournal({
        idempotencyKey: 't1',
        referenceType: 'TEST',
        referenceId: '00000000-0000-0000-0000-000000000001',
        lines: [
          {
            accountCode: 'CASH_RAZORPAY',
            debit: 100,
            entryType: LedgerEntryType.COMMISSION,
          },
          {
            accountCode: 'PLATFORM_COMMISSION',
            credit: 40,
            entryType: LedgerEntryType.COMMISSION,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is idempotent on idempotencyKey', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      id: 'existing',
      entries: [],
    });
    const result = await service.postJournal({
      idempotencyKey: 'dup',
      referenceType: 'TEST',
      referenceId: '00000000-0000-0000-0000-000000000001',
      lines: [
        {
          accountCode: 'CASH_RAZORPAY',
          debit: 40,
          entryType: LedgerEntryType.COMMISSION,
        },
        {
          accountCode: 'PLATFORM_COMMISSION',
          credit: 40,
          entryType: LedgerEntryType.COMMISSION,
        },
      ],
    });
    expect(result.id).toBe('existing');
    expect(prisma.ledgerTransaction.create).not.toHaveBeenCalled();
  });

  it('posts balanced journal', async () => {
    const result = await service.postJournal({
      idempotencyKey: 'ok',
      referenceType: 'TEST',
      referenceId: '00000000-0000-0000-0000-000000000001',
      lines: [
        {
          accountCode: 'CASH_RAZORPAY',
          debit: 40,
          entryType: LedgerEntryType.COMMISSION,
        },
        {
          accountCode: 'PLATFORM_COMMISSION',
          credit: 40,
          entryType: LedgerEntryType.COMMISSION,
        },
      ],
    });
    expect(result.id).toBe('tx1');
    expect(prisma.ledgerTransaction.create).toHaveBeenCalled();
  });
});
