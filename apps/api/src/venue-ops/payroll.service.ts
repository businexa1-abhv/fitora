import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PayrollPeriodStatus } from '@prisma/client';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.module';
import { UpdatePayrollLineDto } from './dto/venue-ops.dto';
import { resolveTenant } from './tenant-access.helper';
import {
  defaultRatePerSession,
  formatPayrollLine,
  formatPayrollPeriod,
  parseDateOnly,
  toDateString,
} from './venue-ops.mapper';

const TRAINER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

@Injectable()
export class PayrollService {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
  ) {}

  async getCurrentPeriod(user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const endDate = parseDateOnly(toDateString(new Date()));
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 13);

    let period = await this.prisma.payrollPeriod.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        status: PayrollPeriodStatus.OPEN,
        startDate,
        endDate,
      },
    });

    if (!period) {
      period = await this.prisma.payrollPeriod.create({
        data: {
          tenantId: tenant.id,
          startDate,
          endDate,
          status: PayrollPeriodStatus.OPEN,
        },
      });
    }

    const lineCount = await this.prisma.payrollLine.count({
      where: { periodId: period.id },
    });
    if (lineCount === 0) {
      await this.generateLines(period.id, tenant.id, startDate, endDate);
    }

    return this.getPeriodById(period.id, user);
  }

  async getPeriodById(id: string, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!period) throw new NotFoundException('Payroll period not found');

    const lines = await this.prisma.payrollLine.findMany({
      where: { periodId: period.id },
      include: { trainer: { select: TRAINER_SELECT } },
      orderBy: [{ trainer: { firstName: 'asc' } }, { trainer: { lastName: 'asc' } }],
    });

    return formatPayrollPeriod(period, lines);
  }

  async regeneratePeriod(id: string, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!period) throw new NotFoundException('Payroll period not found');

    await this.generateLines(period.id, tenant.id, period.startDate, period.endDate);
    return this.getPeriodById(id, user);
  }

  async updateLine(id: string, dto: UpdatePayrollLineDto, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const line = await this.prisma.payrollLine.findFirst({
      where: {
        id,
        period: { tenantId: tenant.id, deletedAt: null },
      },
      include: { trainer: { select: TRAINER_SELECT } },
    });
    if (!line) throw new NotFoundException('Payroll line not found');

    const updated = await this.prisma.payrollLine.update({
      where: { id },
      data: {
        status: dto.status,
        paidAt: dto.status === 'PAID' ? new Date() : null,
      },
      include: { trainer: { select: TRAINER_SELECT } },
    });
    return formatPayrollLine(updated);
  }

  private async generateLines(periodId: string, tenantId: string, startDate: Date, endDate: Date) {
    const trainers = await this.prisma.tenantTrainer.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      include: { user: { select: TRAINER_SELECT } },
    });

    await this.prisma.payrollLine.deleteMany({ where: { periodId } });

    if (trainers.length === 0) return;

    const sessionCounts = await Promise.all(
      trainers.map(async (trainer) => {
        const sessions = await this.prisma.attendanceRecord.count({
          where: {
            deletedAt: null,
            present: true,
            date: { gte: startDate, lte: endDate },
            enrollment: {
              deletedAt: null,
              batch: {
                trainerId: trainer.userId,
                program: { tenantId },
              },
            },
          },
        });
        return { trainerId: trainer.userId, sessions };
      }),
    );

    await this.prisma.payrollLine.createMany({
      data: sessionCounts.map(({ trainerId, sessions }) => {
        const ratePerSession = defaultRatePerSession(trainerId);
        return {
          periodId,
          trainerId,
          sessions,
          ratePerSession,
          commission: sessions * ratePerSession,
          status: 'PENDING' as const,
        };
      }),
    });
  }
}
