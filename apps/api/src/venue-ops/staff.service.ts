import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.module';
import { CreateStaffShiftDto, StaffShiftQueryDto, UpdateStaffShiftDto } from './dto/venue-ops.dto';
import { resolveTenant } from './tenant-access.helper';
import { formatStaffShift, parseDateOnly, parseStaffRole } from './venue-ops.mapper';

@Injectable()
export class StaffService {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
  ) {}

  async list(user: AuthUserPayload, query: StaffShiftQueryDto) {
    const tenant = await resolveTenant(this.prisma, user);
    const dateFilter =
      query.from || query.to
        ? {
            ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
            ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
          }
        : undefined;

    const shifts = await this.prisma.staffShift.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return shifts.map(formatStaffShift);
  }

  async create(dto: CreateStaffShiftDto, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const shift = await this.prisma.staffShift.create({
      data: {
        tenantId: tenant.id,
        staffName: dto.staffName,
        role: parseStaffRole(dto.role),
        date: parseDateOnly(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        area: dto.area,
        notes: dto.notes,
        staffUserId: dto.staffUserId,
      },
    });
    return formatStaffShift(shift);
  }

  async update(id: string, dto: UpdateStaffShiftDto, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const existing = await this.prisma.staffShift.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Staff shift not found');

    const shift = await this.prisma.staffShift.update({
      where: { id },
      data: {
        staffName: dto.staffName,
        role: dto.role ? parseStaffRole(dto.role) : undefined,
        date: dto.date ? parseDateOnly(dto.date) : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        area: dto.area,
        notes: dto.notes,
        staffUserId: dto.staffUserId,
      },
    });
    return formatStaffShift(shift);
  }

  async remove(id: string, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const existing = await this.prisma.staffShift.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Staff shift not found');

    await this.prisma.staffShift.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
