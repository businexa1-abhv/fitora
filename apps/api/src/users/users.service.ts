import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type PrismaService } from '../prisma/prisma.module';
import { type CompletePlayerOnboardingDto } from './dto/complete-player-onboarding.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

    return {
      ...user,
      roles: user.roles.map((r) => r.role),
    };
  }
}
