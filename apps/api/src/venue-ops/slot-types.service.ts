import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.module';
import { CreateSlotTypeDto, UpdateSlotTypeDto } from './dto/venue-ops.dto';
import { resolveTenant } from './tenant-access.helper';
import { formatSlotType } from './venue-ops.mapper';

const DEFAULT_SLOT_TYPES = [
  {
    name: 'Corporate',
    description: 'Corporate bookings and team events.',
    durationMin: 60,
    multiplier: 1.0,
    color: 'Blue',
    sortOrder: 0,
  },
  {
    name: 'Membership',
    description: 'Member-exclusive discounted slots.',
    durationMin: 60,
    multiplier: 0.8,
    color: 'Emerald',
    sortOrder: 1,
  },
  {
    name: 'Hourly',
    description: 'Standard hourly court rental.',
    durationMin: 60,
    multiplier: 1.0,
    color: 'Indigo',
    sortOrder: 2,
  },
  {
    name: 'Walk-In',
    description: 'Walk-in guest bookings at premium rate.',
    durationMin: 60,
    multiplier: 1.1,
    color: 'Amber',
    sortOrder: 3,
  },
  {
    name: 'Tournament',
    description: 'Extended tournament match slots.',
    durationMin: 120,
    multiplier: 2.0,
    color: 'Rose',
    sortOrder: 4,
  },
] as const;

@Injectable()
export class SlotTypesService {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
  ) {}

  async list(user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    let slotTypes = await this.prisma.slotTypeConfig.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (slotTypes.length === 0) {
      await this.prisma.slotTypeConfig.createMany({
        data: DEFAULT_SLOT_TYPES.map((item) => ({
          tenantId: tenant.id,
          ...item,
        })),
      });
      slotTypes = await this.prisma.slotTypeConfig.findMany({
        where: { tenantId: tenant.id, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    }

    return slotTypes.map(formatSlotType);
  }

  async create(dto: CreateSlotTypeDto, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const slotType = await this.prisma.slotTypeConfig.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        description: dto.description,
        durationMin: dto.durationMin,
        multiplier: dto.multiplier,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return formatSlotType(slotType);
  }

  async update(id: string, dto: UpdateSlotTypeDto, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const existing = await this.prisma.slotTypeConfig.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Slot type not found');

    const slotType = await this.prisma.slotTypeConfig.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        durationMin: dto.durationMin,
        multiplier: dto.multiplier,
        color: dto.color,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
    return formatSlotType(slotType);
  }

  async remove(id: string, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const existing = await this.prisma.slotTypeConfig.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Slot type not found');

    await this.prisma.slotTypeConfig.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }
}
