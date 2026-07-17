import { Injectable, NotFoundException } from '@nestjs/common';
import { MerchantWalletRole, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { round2, toNumber } from '../money.util';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class MerchantWalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(
    ownerUserId: string,
    role: MerchantWalletRole,
    tenantId?: string | null,
    tx?: TxClient,
  ) {
    const db = tx ?? this.prisma;
    const existing = await db.merchantWallet.findUnique({
      where: { ownerUserId_role: { ownerUserId, role } },
    });
    if (existing) {
      if (tenantId && !existing.tenantId) {
        return db.merchantWallet.update({
          where: { id: existing.id },
          data: { tenantId },
        });
      }
      return existing;
    }
    return db.merchantWallet.create({
      data: {
        ownerUserId,
        role,
        tenantId: tenantId ?? null,
      },
    });
  }

  async getPlatformWallet(platformUserId: string, tx?: TxClient) {
    return this.getOrCreate(platformUserId, MerchantWalletRole.PLATFORM, null, tx);
  }

  async creditPending(walletId: string, amount: number, tx: TxClient): Promise<void> {
    const amt = round2(amount);
    if (amt <= 0) return;
    await tx.$executeRaw`
      SELECT id FROM merchant_wallets WHERE id = ${walletId}::uuid FOR UPDATE
    `;
    await tx.merchantWallet.update({
      where: { id: walletId },
      data: {
        pending: { increment: amt },
        lifetimeEarned: { increment: amt },
      },
    });
  }

  async creditAvailable(walletId: string, amount: number, tx: TxClient): Promise<void> {
    const amt = round2(amount);
    if (amt <= 0) return;
    await tx.$executeRaw`
      SELECT id FROM merchant_wallets WHERE id = ${walletId}::uuid FOR UPDATE
    `;
    await tx.merchantWallet.update({
      where: { id: walletId },
      data: {
        available: { increment: amt },
        lifetimeEarned: { increment: amt },
      },
    });
  }

  /** Move pending → available (settlement preparation) or pending → paid out */
  async settlePending(walletId: string, amount: number, tx: TxClient): Promise<void> {
    const amt = round2(amount);
    if (amt <= 0) return;
    await tx.$executeRaw`
      SELECT id FROM merchant_wallets WHERE id = ${walletId}::uuid FOR UPDATE
    `;
    const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: walletId } });
    if (toNumber(wallet.pending) < amt - 0.001) {
      throw new NotFoundException('Insufficient pending balance for settlement');
    }
    await tx.merchantWallet.update({
      where: { id: walletId },
      data: {
        pending: { decrement: amt },
        lifetimePaidOut: { increment: amt },
      },
    });
  }

  async debitPending(walletId: string, amount: number, tx: TxClient): Promise<void> {
    const amt = round2(amount);
    if (amt <= 0) return;
    await tx.$executeRaw`
      SELECT id FROM merchant_wallets WHERE id = ${walletId}::uuid FOR UPDATE
    `;
    const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: walletId } });
    const pending = toNumber(wallet.pending);
    const available = toNumber(wallet.available);
    if (pending + available < amt - 0.001) {
      throw new NotFoundException('Insufficient wallet balance for refund');
    }
    if (pending >= amt) {
      await tx.merchantWallet.update({
        where: { id: walletId },
        data: { pending: { decrement: amt } },
      });
    } else {
      const fromPending = pending;
      const fromAvailable = round2(amt - fromPending);
      await tx.merchantWallet.update({
        where: { id: walletId },
        data: {
          pending: { decrement: fromPending },
          available: { decrement: fromAvailable },
        },
      });
    }
  }

  async getForUser(userId: string, role?: MerchantWalletRole) {
    const wallets = await this.prisma.merchantWallet.findMany({
      where: {
        ownerUserId: userId,
        ...(role ? { role } : {}),
      },
    });
    return wallets.map((w) => this.format(w));
  }

  format(w: {
    id: string;
    ownerUserId: string;
    tenantId: string | null;
    role: MerchantWalletRole;
    available: unknown;
    pending: unknown;
    lifetimeEarned: unknown;
    lifetimePaidOut: unknown;
    currency: string;
    updatedAt: Date;
  }) {
    return {
      id: w.id,
      ownerUserId: w.ownerUserId,
      tenantId: w.tenantId,
      role: w.role,
      available: toNumber(w.available),
      pending: toNumber(w.pending),
      settled: toNumber(w.lifetimePaidOut),
      lifetimeEarned: toNumber(w.lifetimeEarned),
      lifetimePaidOut: toNumber(w.lifetimePaidOut),
      currency: w.currency,
      updatedAt: w.updatedAt.toISOString(),
    };
  }
}
