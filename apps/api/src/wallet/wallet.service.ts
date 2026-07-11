import { BadRequestException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import {
  PaymentEntityType,
  PaymentStatus,
  Prisma,
  WalletTransactionType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    private notificationsService: NotificationsService,
  ) {}

  async getOrCreateWallet(userId: string) {
    const existing = await this.prisma.wallet.findFirst({
      where: { userId, deletedAt: null },
    });
    if (existing) return existing;

    return this.prisma.wallet.create({
      data: { userId, balance: 0, currency: 'INR' },
    });
  }

  async getWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      id: wallet.id,
      balance: Number(wallet.balance),
      currency: wallet.currency,
      transactions: transactions.map((t: (typeof transactions)[number]) => this.formatTransaction(t)),
    };
  }

  async listTransactions(userId: string, page = 1, pageSize = 20) {
    const wallet = await this.getOrCreateWallet(userId);
    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      items: items.map((t: (typeof items)[number]) => this.formatTransaction(t)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async initiateTopup(userId: string, amount: number) {
    if (amount < 100) {
      throw new BadRequestException('Minimum top-up amount is ₹100');
    }
    if (amount > 50000) {
      throw new BadRequestException('Maximum top-up amount is ₹50,000');
    }

    const wallet = await this.getOrCreateWallet(userId);
    return this.paymentsService.createPaymentOrder(
      userId,
      amount,
      PaymentEntityType.WALLET_TOPUP,
      wallet.id,
    );
  }

  async creditFromTopup(walletId: string, amount: number, paymentId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { id: walletId, deletedAt: null },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore + amount;

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: walletId },
        data: { balance: balanceAfter },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId,
          type: WalletTransactionType.CREDIT,
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: PaymentEntityType.WALLET_TOPUP,
          referenceId: paymentId,
          description: 'Wallet top-up',
        },
      }),
    ]);

    await this.notificationsService.notifyWalletCredit(wallet.userId, amount, balanceAfter);

    return { balance: balanceAfter };
  }

  private formatTransaction(t: {
    id: string;
    type: WalletTransactionType;
    amount: Prisma.Decimal;
    balanceAfter: Prisma.Decimal;
    description: string | null;
    createdAt: Date;
  }) {
    return {
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    };
  }
}
