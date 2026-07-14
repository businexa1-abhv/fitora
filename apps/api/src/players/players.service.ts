import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import {
  NotificationOptInDto,
  UpdateFavoriteSportsDto,
  UpsertPlayerProfileDto,
} from './dto/player-profile.dto';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async upsertProfile(userId: string, dto: UpsertPlayerProfileDto) {
    if (!dto.agreeTerms) {
      throw new BadRequestException('You must agree to the Terms & Privacy Policy');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      include: { roles: { where: { deletedAt: null } } },
    });

    if (!user) throw new NotFoundException('User not found');

    const isPlayer = user.roles.some((r) => r.role === UserRole.PLAYER);
    if (!isPlayer) {
      await this.prisma.userRoleAssignment.create({
        data: { userId, role: UserRole.PLAYER },
      });
    }

    if (dto.favoriteSportIds?.length) {
      await this.assertSportsExist(dto.favoriteSportIds);
    }

    const emailUpdate =
      user.email.endsWith('@users.fitora.app') && dto.firstName
        ? undefined // keep placeholder until user sets real email elsewhere
        : undefined;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        avatarUrl: dto.avatarUrl,
        ...(emailUpdate ? { email: emailUpdate } : {}),
      },
    });

    const profile = await this.prisma.playerProfile.upsert({
      where: { userId },
      create: {
        userId,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        city: dto.city.trim(),
        skillLevel: dto.skillLevel,
        latitude: dto.latitude != null ? new Prisma.Decimal(dto.latitude) : undefined,
        longitude: dto.longitude != null ? new Prisma.Decimal(dto.longitude) : undefined,
        locationLabel: dto.locationLabel,
        termsAcceptedAt: new Date(),
      },
      update: {
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        city: dto.city.trim(),
        skillLevel: dto.skillLevel,
        latitude: dto.latitude != null ? new Prisma.Decimal(dto.latitude) : undefined,
        longitude: dto.longitude != null ? new Prisma.Decimal(dto.longitude) : undefined,
        locationLabel: dto.locationLabel,
        termsAcceptedAt: new Date(),
        deletedAt: null,
      },
    });

    if (dto.favoriteSportIds?.length) {
      await this.replaceFavoriteSports(profile.id, dto.favoriteSportIds, dto.skillLevel);
    }

    return this.getProfile(userId);
  }

  async updateFavoriteSports(userId: string, dto: UpdateFavoriteSportsDto) {
    await this.assertSportsExist(dto.sportIds);

    const profile = await this.ensureProfile(userId);
    await this.replaceFavoriteSports(profile.id, dto.sportIds, dto.skillLevel);

    await this.prisma.playerProfile.update({
      where: { id: profile.id },
      data: {
        skillLevel: dto.skillLevel ?? profile.skillLevel,
      },
    });

    return this.getProfile(userId);
  }

  async setNotificationsOptIn(userId: string, dto: NotificationOptInDto) {
    const profile = await this.ensureProfile(userId);
    await this.prisma.playerProfile.update({
      where: { id: profile.id },
      data: {
        notificationsOptInAt: dto.enabled ? new Date() : null,
        onboardingCompletedAt: new Date(),
      },
    });
    return { success: true, enabled: dto.enabled };
  }

  async completeOnboarding(userId: string) {
    const profile = await this.ensureProfile(userId);
    await this.prisma.playerProfile.update({
      where: { id: profile.id },
      data: { onboardingCompletedAt: new Date() },
    });
    return this.getProfile(userId);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        playerProfile: {
          where: { deletedAt: null },
          include: {
            favoriteSports: {
              include: {
                sport: {
                  select: { id: true, name: true, slug: true, iconUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const profile = user.playerProfile;
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      gender: profile?.gender ?? null,
      dateOfBirth: profile?.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      city: profile?.city ?? null,
      skillLevel: profile?.skillLevel ?? null,
      locationLabel: profile?.locationLabel ?? null,
      latitude: profile?.latitude ? Number(profile.latitude) : null,
      longitude: profile?.longitude ? Number(profile.longitude) : null,
      termsAcceptedAt: profile?.termsAcceptedAt?.toISOString() ?? null,
      notificationsOptInAt: profile?.notificationsOptInAt?.toISOString() ?? null,
      onboardingComplete: Boolean(profile?.onboardingCompletedAt),
      favoriteSports:
        profile?.favoriteSports.map((f) => ({
          id: f.sport.id,
          name: f.sport.name,
          slug: f.sport.slug,
          iconUrl: f.sport.iconUrl,
          skillLevel: f.skillLevel,
        })) ?? [],
    };
  }

  private async ensureProfile(userId: string) {
    const existing = await this.prisma.playerProfile.findFirst({
      where: { userId, deletedAt: null },
    });
    if (existing) return existing;

    return this.prisma.playerProfile.create({ data: { userId } });
  }

  private async assertSportsExist(sportIds: string[]) {
    const count = await this.prisma.sport.count({
      where: { id: { in: sportIds }, isActive: true, deletedAt: null },
    });
    if (count !== sportIds.length) {
      throw new BadRequestException('One or more sports are invalid');
    }
  }

  private async replaceFavoriteSports(
    playerProfileId: string,
    sportIds: string[],
    skillLevel?: UpsertPlayerProfileDto['skillLevel'],
  ) {
    await this.prisma.$transaction([
      this.prisma.playerFavoriteSport.deleteMany({ where: { playerProfileId } }),
      this.prisma.playerFavoriteSport.createMany({
        data: sportIds.map((sportId) => ({
          playerProfileId,
          sportId,
          skillLevel,
        })),
      }),
    ]);
  }
}
