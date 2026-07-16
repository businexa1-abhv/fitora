import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.module';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/venue-ops.dto';
import { resolveTenant } from './tenant-access.helper';
import { formatExpense, parseDateOnly, parsePaymentMethod } from './venue-ops.mapper';

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
  ) {}

  async list(user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return expenses.map(formatExpense);
  }

  async getById(id: string, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return formatExpense(expense);
  }

  async create(dto: CreateExpenseDto, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const expense = await this.prisma.expense.create({
      data: {
        tenantId: tenant.id,
        createdById: user.id,
        title: dto.title,
        category: dto.category,
        amount: dto.amount,
        date: parseDateOnly(dto.date),
        notes: dto.notes,
        paymentMethod: dto.paymentMethod ? parsePaymentMethod(dto.paymentMethod) : undefined,
        courtId: dto.courtId,
        receiptUrl: dto.receiptUrl,
      },
    });
    return formatExpense(expense);
  }

  async update(id: string, dto: UpdateExpenseDto, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const existing = await this.prisma.expense.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Expense not found');

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        title: dto.title,
        category: dto.category,
        amount: dto.amount,
        date: dto.date ? parseDateOnly(dto.date) : undefined,
        notes: dto.notes,
        paymentMethod:
          dto.paymentMethod === undefined
            ? undefined
            : dto.paymentMethod
              ? parsePaymentMethod(dto.paymentMethod)
              : null,
        courtId: dto.courtId,
        receiptUrl: dto.receiptUrl,
      },
    });
    return formatExpense(expense);
  }

  async remove(id: string, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const existing = await this.prisma.expense.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Expense not found');

    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
