import { Injectable } from '@nestjs/common';
import { FinanceInvoiceType, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { financeInvoiceNumber, toNumber } from '../money.util';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class FinanceInvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: {
      type: FinanceInvoiceType;
      partyUserId: string;
      tenantId?: string | null;
      subtotal: number;
      gst: number;
      total: number;
      lineItems: unknown;
      paymentId?: string | null;
      settlementId?: string | null;
    },
    tx?: TxClient,
  ) {
    const db = tx ?? this.prisma;
    const count = await db.financeInvoice.count();
    const prefix =
      params.type === FinanceInvoiceType.SUBSCRIPTION
        ? 'SUB'
        : params.type === FinanceInvoiceType.SETTLEMENT
          ? 'STL'
          : 'FIN';

    return db.financeInvoice.create({
      data: {
        type: params.type,
        invoiceNumber: financeInvoiceNumber(prefix, count + 1),
        partyUserId: params.partyUserId,
        tenantId: params.tenantId ?? null,
        subtotal: params.subtotal,
        gst: params.gst,
        total: params.total,
        lineItems: params.lineItems as Prisma.InputJsonValue,
        paymentId: params.paymentId ?? null,
        settlementId: params.settlementId ?? null,
      },
    });
  }

  async getBySettlementId(settlementId: string, partyUserId?: string) {
    const invoice = await this.prisma.financeInvoice.findFirst({
      where: {
        settlementId,
        ...(partyUserId ? { partyUserId } : {}),
      },
    });
    if (!invoice) return null;
    return this.getById(invoice.id, partyUserId);
  }

  async getById(id: string, partyUserId?: string) {
    const invoice = await this.prisma.financeInvoice.findFirst({
      where: {
        id,
        ...(partyUserId ? { partyUserId } : {}),
      },
    });
    if (!invoice) return null;
    return {
      id: invoice.id,
      type: invoice.type,
      invoiceNumber: invoice.invoiceNumber,
      subtotal: toNumber(invoice.subtotal),
      gst: toNumber(invoice.gst),
      total: toNumber(invoice.total),
      lineItems: invoice.lineItems,
      settlementId: invoice.settlementId,
      paymentId: invoice.paymentId,
      createdAt: invoice.createdAt.toISOString(),
    };
  }
}
