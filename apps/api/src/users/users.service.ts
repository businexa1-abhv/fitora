import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { SlotEventsService } from '../realtime/slot-events.service';
import { type CompletePlayerOnboardingDto } from './dto/complete-player-onboarding.dto';

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    private events: SlotEventsService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
      omit: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      roles: user.roles.map((r) => r.role),
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { roles: true },
      omit: { passwordHash: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      ...user,
      roles: user.roles.map((r) => r.role),
    }));
  }

  async completePlayerOnboarding(id: string, dto: CompletePlayerOnboardingDto) {
    const email = dto.email.trim().toLowerCase();
    const profileImage = dto.profileImage?.trim();
    const existing = await this.prisma.user.findFirst({
      where: { email, id: { not: id }, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName?.trim() ?? '',
        ...(profileImage ? { avatarUrl: profileImage } : {}),
      },
      include: { roles: true },
      omit: { passwordHash: true },
    });

    if (dto.notificationsEnabled !== undefined) {
      await this.prisma.notificationPreference.upsert({
        where: { userId: id },
        create: {
          userId: id,
          pushEnabled: dto.notificationsEnabled,
          inAppEnabled: true,
        },
        update: {
          pushEnabled: dto.notificationsEnabled,
          inAppEnabled: true,
        },
      });
    }

    await this.events.emitPlayerUpdated({
      userId: id,
      action: 'onboarding_completed',
    });

    return {
      ...user,
      roles: user.roles.map((r) => r.role),
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const data: Record<string, string> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { roles: true },
      omit: { passwordHash: true },
    });

    return {
      ...user,
      roles: user.roles.map((r) => r.role),
    };
  }
}
