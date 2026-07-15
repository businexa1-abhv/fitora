import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourtApprovalStatus,
  OtpPurpose,
  PartnerApplicationStatus,
  type Prisma,
  TenantStatus,
  UserRole,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { OtpService } from '../auth/services/otp.service';
import { PasswordService } from '../auth/services/password.service';
import { TokenService } from '../auth/services/token.service';
import { CacheService } from '../common/redis/cache.service';
import { CACHE_PREFIX } from '../common/redis/cache.constants';
import { getPermissionsForRoles } from '@fitora/types';
import type { UserRole as TypesUserRole } from '@fitora/types';
import {
  type PartnerBusinessDto,
  type PartnerLegalDto,
  type PartnerSportsConfigDto,
  type PartnerSubmitDto,
  type PartnerTrainersDto,
  type PartnerVenueDto,
  type PartnerVerifyPhoneDto,
  type PartnerVisualsDto,
} from './dto/partner-onboarding.dto';
import {
  type ListPartnerApplicationsQueryDto,
  type RejectPartnerApplicationDto,
} from './dto/admin-partner.dto';

function splitOwnerName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Owner', lastName: 'Partner' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || 'Partner' };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

type SportsConfigItem = {
  sportSlug: string;
  courtCount: number;
  standardRate: number;
  memberRate?: number;
};

type TxClient = Prisma.TransactionClient;

@Injectable()
export class PartnerOnboardingService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private cacheService: CacheService,
  ) {}

  /**
   * Creates Court rows from the application's sportsConfig.
   * Skips sports that are missing from the catalog; callers must validate count.
   */
  private async provisionCourtsFromApplication(
    tx: TxClient,
    application: {
      id: string;
      businessName: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      venueAddress: string | null;
      sportsConfig: Prisma.JsonValue | null;
      venue: Prisma.JsonValue | null;
      visuals: Prisma.JsonValue | null;
    },
    tenantId: string,
    ownerId: string,
    approvalStatus: CourtApprovalStatus = CourtApprovalStatus.PENDING,
  ) {
    const sportsConfig =
      (application.sportsConfig as { items?: SportsConfigItem[] } | null)?.items ?? [];

    const venue =
      (application.venue as {
        amenities?: string[];
        latitude?: number;
        longitude?: number;
        courtType?: string;
      } | null) ?? {};

    const visuals =
      (application.visuals as {
        courtPhotoUrls?: string[];
        exteriorUrl?: string;
        receptionUrl?: string;
      } | null) ?? {};

    const imageUrls = [
      ...(visuals.exteriorUrl ? [visuals.exteriorUrl] : []),
      ...(visuals.receptionUrl ? [visuals.receptionUrl] : []),
      ...(visuals.courtPhotoUrls ?? []),
    ].filter(Boolean);

    const createdCourts = [];
    const missingSlugs: string[] = [];

    for (const item of sportsConfig) {
      const sport = await tx.sport.findFirst({
        where: { slug: item.sportSlug, deletedAt: null, isActive: true },
      });
      if (!sport) {
        missingSlugs.push(item.sportSlug);
        continue;
      }

      const count = Math.max(1, item.courtCount || 1);
      for (let i = 0; i < count; i++) {
        // Venue brand as primary label; Court N so multi-court venues stay distinct in lists.
        const courtName =
          count === 1
            ? `${application.businessName}`
            : `${application.businessName} · Court ${i + 1}`;
        const baseSlug = slugify(
          `${application.businessName}-${sport.slug}-court-${i + 1}-${application.city}`,
        );
        let slug = baseSlug || `court-${Date.now()}`;
        for (let n = 0; n < 20; n++) {
          const exists = await tx.court.findFirst({
            where: { tenantId, slug, deletedAt: null },
          });
          if (!exists) break;
          slug = `${baseSlug}-${n + 1}`;
        }

        const approved = approvalStatus === CourtApprovalStatus.APPROVED;
        const court = await tx.court.create({
          data: {
            tenantId,
            ownerId,
            sportId: sport.id,
            name: courtName,
            slug,
            description: venue.courtType
              ? `${sport.name} · Court ${i + 1} (${venue.courtType})`
              : `${sport.name} · Court ${i + 1} at ${application.businessName}`,
            address: application.venueAddress!,
            city: application.city!,
            state: application.state,
            pincode: application.pincode,
            latitude: venue.latitude,
            longitude: venue.longitude,
            amenities: venue.amenities ?? [],
            defaultSlotPrice: item.standardRate,
            approvalStatus,
            isApproved: approved,
            isActive: approved,
            approvedAt: approved ? new Date() : null,
            images: imageUrls.length
              ? {
                  create: imageUrls.slice(0, 8).map((url, index) => ({
                    url,
                    sortOrder: index,
                    isPrimary: index === 0,
                    altText: `${application.businessName} photo ${index + 1}`,
                  })),
                }
              : undefined,
          },
        });
        createdCourts.push(court);
      }
    }

    return { createdCourts, sportsConfig, missingSlugs };
  }

  async createDraft() {
    const application = await this.prisma.partnerApplication.create({
      data: { status: PartnerApplicationStatus.DRAFT, currentStep: 'business' },
    });
    return this.format(application);
  }

  async getById(id: string) {
    const application = await this.getOrThrow(id);
    return this.format(application);
  }

  async saveBusiness(id: string, dto: PartnerBusinessDto) {
    const application = await this.getDraftOrThrow(id);
    const phoneDigits = dto.phone.replace(/\D/g, '');
    const phone =
      phoneDigits.length === 10
        ? this.otpService.composePhone('91', phoneDigits)
        : this.otpService.normalizePhone(dto.phone);

    const updated = await this.prisma.partnerApplication.update({
      where: { id: application.id },
      data: {
        ownerName: dto.ownerName.trim(),
        businessName: dto.businessName.trim(),
        phone,
        phoneVerified: application.phone === phone ? application.phoneVerified : false,
        email: dto.email.toLowerCase().trim(),
        city: dto.city.trim(),
        venueAddress: dto.venueAddress.trim(),
        state: dto.state.trim(),
        pincode: dto.pincode,
        currentStep: 'venue',
      },
    });

    return this.format(updated);
  }

  async sendOtp(id: string) {
    const application = await this.getDraftOrThrow(id);
    if (!application.phone) {
      throw new BadRequestException('Save business details with a phone number first');
    }

    return this.otpService.sendOtp(application.phone, OtpPurpose.VERIFY_PHONE);
  }

  async verifyPhone(id: string, dto: PartnerVerifyPhoneDto) {
    const application = await this.getDraftOrThrow(id);
    if (!application.phone) {
      throw new BadRequestException('Phone number is required');
    }

    await this.otpService.verifyOtp(application.phone, dto.otp, OtpPurpose.VERIFY_PHONE);

    const updated = await this.prisma.partnerApplication.update({
      where: { id: application.id },
      data: { phoneVerified: true },
    });

    return this.format(updated);
  }

  async saveVenue(id: string, dto: PartnerVenueDto) {
    const application = await this.getDraftOrThrow(id);
    if (!dto.sports?.length) {
      throw new BadRequestException('Select at least one sport');
    }

    const updated = await this.prisma.partnerApplication.update({
      where: { id: application.id },
      data: {
        venue: dto as unknown as Prisma.InputJsonValue,
        currentStep: 'sports',
      },
    });

    return this.format(updated);
  }

  async saveSports(id: string, dto: PartnerSportsConfigDto) {
    await this.getDraftOrThrow(id);
    if (!dto.items?.length) {
      throw new BadRequestException('Configure at least one sport');
    }

    const updated = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        sportsConfig: dto as unknown as Prisma.InputJsonValue,
        currentStep: 'trainers',
      },
    });

    return this.format(updated);
  }

  async saveTrainers(id: string, dto: PartnerTrainersDto) {
    await this.getDraftOrThrow(id);
    const updated = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        trainers: dto.trainers as unknown as Prisma.InputJsonValue,
        currentStep: 'legal',
      },
    });
    return this.format(updated);
  }

  async saveLegal(id: string, dto: PartnerLegalDto) {
    await this.getDraftOrThrow(id);
    const updated = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        legal: dto as unknown as Prisma.InputJsonValue,
        currentStep: 'review',
      },
    });
    return this.format(updated);
  }

  async saveVisuals(id: string, dto: PartnerVisualsDto) {
    await this.getDraftOrThrow(id);
    const updated = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        visuals: dto as unknown as Prisma.InputJsonValue,
        currentStep: 'review',
      },
    });
    return this.format(updated);
  }

  async submit(id: string, dto: PartnerSubmitDto = {}) {
    const application = await this.getDraftOrThrow(id);
    this.assertReadyForSubmit(application);

    const email = application.email!.toLowerCase();
    const phone = application.phone!;
    const { firstName, lastName } = splitOwnerName(application.ownerName!);

    const existingEmail = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (existingEmail) {
      throw new ConflictException('An account with this email already exists. Please log in.');
    }

    const existingPhone = await this.prisma.user.findFirst({
      where: { phone, deletedAt: null },
    });
    if (existingPhone) {
      throw new ConflictException('An account with this phone already exists. Please log in.');
    }

    const password = dto.password ?? this.generatePassword();
    const passwordHash = await this.passwordService.hashPassword(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          phoneVerified: true,
          emailVerified: false,
          roles: { create: { role: UserRole.COURT_OWNER } },
        },
        include: { roles: { where: { deletedAt: null } } },
      });

      const existingTenant = await tx.tenant.findFirst({
        where: { ownerId: user.id, deletedAt: null },
      });

      let tenant = existingTenant;
      if (!tenant) {
        const baseSlug = slugify(application.businessName!) || 'partner';
        let slug = baseSlug;
        for (let i = 0; i < 20; i++) {
          const taken = await tx.tenant.findFirst({ where: { slug, deletedAt: null } });
          if (!taken) break;
          slug = `${baseSlug}-${i + 1}`;
        }

        const logoUrl =
          typeof (application.visuals as { logoUrl?: string } | null)?.logoUrl === 'string'
            ? (application.visuals as { logoUrl?: string }).logoUrl
            : undefined;

        tenant = await tx.tenant.create({
          data: {
            name: application.businessName!,
            slug,
            brandName: application.businessName!,
            ownerId: user.id,
            status: TenantStatus.PENDING,
            logoUrl,
            members: { create: { userId: user.id, role: UserRole.COURT_OWNER } },
          },
        });
      } else {
        tenant = await tx.tenant.update({
          where: { id: tenant.id },
          data: {
            status: TenantStatus.PENDING,
            brandName: application.businessName!,
            name: application.businessName!,
          },
        });
      }

      const { createdCourts, sportsConfig, missingSlugs } =
        await this.provisionCourtsFromApplication(
          tx,
          application,
          tenant.id,
          user.id,
          CourtApprovalStatus.PENDING,
        );

      if (sportsConfig.length > 0 && createdCourts.length === 0) {
        throw new BadRequestException(
          missingSlugs.length
            ? `Unknown sports: ${missingSlugs.join(', ')}. Seed sports catalog before onboarding.`
            : 'No courts could be created from sports configuration',
        );
      }

      if (sportsConfig.length === 0) {
        throw new BadRequestException(
          'Sports configuration is required before submitting an application',
        );
      }

      const trainers =
        (application.trainers as Array<{
          fullName: string;
          specialization: string;
          yearsExperience?: number;
          mobile?: string;
          aadhaar?: string;
        }> | null) ?? [];

      for (const trainer of trainers) {
        if (!trainer.fullName?.trim()) continue;
        const trainerPhone = trainer.mobile
          ? this.otpService.normalizePhone(trainer.mobile)
          : undefined;
        const trainerEmail = trainerPhone
          ? `trainer.${trainerPhone.replace(/\D/g, '')}.${user.id.slice(0, 8)}@fitora.local`
          : `trainer.${slugify(trainer.fullName)}.${user.id.slice(0, 8)}@fitora.local`;

        const { firstName: tFirst, lastName: tLast } = splitOwnerName(trainer.fullName);
        const trainerUser = await tx.user.create({
          data: {
            email: trainerEmail,
            phone: trainerPhone,
            firstName: tFirst,
            lastName: tLast,
            passwordHash: await this.passwordService.hashPassword(this.generatePassword()),
            phoneVerified: Boolean(trainerPhone),
            roles: { create: { role: UserRole.TRAINER } },
            trainerProfile: {
              create: {
                bio: `${trainer.specialization} coach`,
                specializations: [trainer.specialization],
                yearsExperience: trainer.yearsExperience ?? 0,
              },
            },
          },
        });

        await tx.tenantTrainer.create({
          data: { tenantId: tenant.id, userId: trainerUser.id },
        });
      }

      const submitted = await tx.partnerApplication.update({
        where: { id: application.id },
        data: {
          status: PartnerApplicationStatus.UNDER_REVIEW,
          currentStep: 'submitted',
          userId: user.id,
          tenantId: tenant.id,
          submittedAt: new Date(),
        },
      });

      return { user, tenant, courts: createdCourts, application: submitted, password };
    });

    const tokens = await this.tokenService.issueTokenPair(result.user.id, result.user.email, [
      UserRole.COURT_OWNER,
    ]);

    return {
      application: this.format(result.application),
      tenantId: result.tenant.id,
      courtsCreated: result.courts.length,
      generatedPassword: dto.password ? undefined : result.password,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        roles: [UserRole.COURT_OWNER],
        permissions: getPermissionsForRoles([UserRole.COURT_OWNER as TypesUserRole]),
        phone: result.user.phone,
        avatarUrl: result.user.avatarUrl,
        emailVerified: result.user.emailVerified,
        phoneVerified: result.user.phoneVerified,
      },
      tokens,
    };
  }

  private assertReadyForSubmit(application: Prisma.PartnerApplicationGetPayload<object>): void {
    if (!application.ownerName || !application.businessName) {
      throw new BadRequestException('Business profile is incomplete');
    }
    if (!application.email || !application.phone) {
      throw new BadRequestException('Contact details are required');
    }
    if (!application.phoneVerified) {
      throw new BadRequestException('Verify your mobile number before submitting');
    }
    if (
      !application.city ||
      !application.venueAddress ||
      !application.state ||
      !application.pincode
    ) {
      throw new BadRequestException('Venue address is incomplete');
    }
    if (!application.venue) {
      throw new BadRequestException('Venue details are required');
    }
    if (!application.sportsConfig) {
      throw new BadRequestException('Sports and pricing configuration is required');
    }

    const visuals = application.visuals as { acceptedTerms?: boolean } | null;
    if (!visuals?.acceptedTerms) {
      throw new BadRequestException('Accept the partner terms before submitting');
    }
  }

  // ─── Admin review ─────────────────────────────────────────────────────────

  async listForAdmin(query: ListPartnerApplicationsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where: Prisma.PartnerApplicationWhereInput = {
      ...(query.status
        ? { status: query.status }
        : { status: { not: PartnerApplicationStatus.DRAFT } }),
      ...(query.search && {
        OR: [
          { businessName: { contains: query.search, mode: 'insensitive' } },
          { ownerName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { city: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.partnerApplication.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              isActive: true,
              _count: { select: { courts: true } },
            },
          },
        },
      }),
      this.prisma.partnerApplication.count({ where }),
    ]);

    return {
      items: items.map((item) => this.formatAdmin(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getAdminStats() {
    const [pendingKyc, activeOwners, underReview, activated] = await Promise.all([
      this.prisma.partnerApplication.count({
        where: { status: PartnerApplicationStatus.UNDER_REVIEW },
      }),
      this.prisma.tenant.count({
        where: { status: TenantStatus.ACTIVE, deletedAt: null, isActive: true },
      }),
      this.prisma.partnerApplication.count({
        where: { status: PartnerApplicationStatus.UNDER_REVIEW },
      }),
      this.prisma.partnerApplication.count({
        where: { status: PartnerApplicationStatus.ACTIVATED },
      }),
    ]);

    return { pendingKyc, activeOwners, underReview, activated };
  }

  async getForAdmin(id: string) {
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            isActive: true,
            courts: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                city: true,
                approvalStatus: true,
                isActive: true,
                sport: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    });
    if (!application) throw new NotFoundException('Partner application not found');
    return this.formatAdmin(application);
  }

  async approveApplication(id: string, _adminId: string) {
    const application = await this.getOrThrow(id);
    if (!application.tenantId || !application.userId) {
      throw new BadRequestException('Application has no tenant to activate');
    }

    const existingCourtCount = await this.prisma.court.count({
      where: { tenantId: application.tenantId, deletedAt: null },
    });

    // Allow re-approve only when activation left the tenant with zero courts
    // (e.g. submit ran before sports catalog was seeded).
    if (application.status === PartnerApplicationStatus.ACTIVATED && existingCourtCount > 0) {
      throw new BadRequestException('Application is already activated');
    }
    if (
      application.status !== PartnerApplicationStatus.ACTIVATED &&
      application.status !== PartnerApplicationStatus.UNDER_REVIEW &&
      application.status !== PartnerApplicationStatus.SUBMITTED
    ) {
      throw new BadRequestException('Only submitted applications can be approved');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: application.tenantId! },
        data: { status: TenantStatus.ACTIVE, isActive: true },
      });

      let courtsCreated = 0;
      const courtCount = await tx.court.count({
        where: { tenantId: tenant.id, deletedAt: null },
      });

      if (courtCount === 0) {
        const { createdCourts, sportsConfig, missingSlugs } =
          await this.provisionCourtsFromApplication(
            tx,
            application,
            tenant.id,
            application.userId!,
            CourtApprovalStatus.APPROVED,
          );
        courtsCreated = createdCourts.length;
        if (sportsConfig.length > 0 && createdCourts.length === 0) {
          throw new BadRequestException(
            missingSlugs.length
              ? `Unknown sports: ${missingSlugs.join(', ')}. Seed sports catalog before approval.`
              : 'No courts could be created from sports configuration',
          );
        }
        if (createdCourts.length === 0) {
          throw new BadRequestException(
            'Cannot activate a venue with no courts. Sports configuration is missing.',
          );
        }
      }

      const courts = await tx.court.updateMany({
        where: { tenantId: tenant.id, deletedAt: null },
        data: {
          approvalStatus: CourtApprovalStatus.APPROVED,
          isApproved: true,
          isActive: true,
          approvedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      const updated = await tx.partnerApplication.update({
        where: { id: application.id },
        data: {
          status: PartnerApplicationStatus.ACTIVATED,
          currentStep: 'activated',
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              isActive: true,
              _count: { select: { courts: true } },
            },
          },
        },
      });

      return {
        application: updated,
        courtsApproved: courts.count,
        courtsCreated,
        tenant,
      };
    });

    await this.cacheService.invalidatePattern(`${CACHE_PREFIX}courts:list:*`);
    await this.cacheService.invalidatePattern(`${CACHE_PREFIX}venues:list:*`);
    void _adminId;

    return {
      ...this.formatAdmin(result.application),
      courtsApproved: result.courtsApproved,
      courtsCreated: result.courtsCreated,
    };
  }

  async rejectApplication(id: string, dto: RejectPartnerApplicationDto, _adminId: string) {
    const application = await this.getOrThrow(id);
    if (application.status === PartnerApplicationStatus.REJECTED) {
      throw new BadRequestException('Application is already rejected');
    }
    if (application.status === PartnerApplicationStatus.ACTIVATED) {
      throw new BadRequestException('Activated applications cannot be rejected');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (application.tenantId) {
        await tx.tenant.update({
          where: { id: application.tenantId },
          data: { status: TenantStatus.SUSPENDED, isActive: false },
        });
        await tx.court.updateMany({
          where: { tenantId: application.tenantId, deletedAt: null },
          data: {
            approvalStatus: CourtApprovalStatus.REJECTED,
            isApproved: false,
            isActive: false,
            rejectedAt: new Date(),
            rejectionReason: dto.reason ?? 'Partner application rejected',
          },
        });
      }

      return tx.partnerApplication.update({
        where: { id: application.id },
        data: {
          status: PartnerApplicationStatus.REJECTED,
          currentStep: 'rejected',
          legal: {
            ...((application.legal as Record<string, unknown> | null) ?? {}),
            rejectionReason: dto.reason ?? 'Rejected by admin',
          } as Prisma.InputJsonValue,
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              isActive: true,
              _count: { select: { courts: true } },
            },
          },
        },
      });
    });

    await this.cacheService.invalidatePattern(`${CACHE_PREFIX}courts:list:*`);
    void _adminId;
    return this.formatAdmin(result);
  }

  private formatAdmin(
    application: Prisma.PartnerApplicationGetPayload<{
      include?: {
        user?: true | { select: object };
        tenant?: true | { select: object };
      };
    }> & {
      user?: unknown;
      tenant?: unknown;
    },
  ) {
    return {
      ...this.format(application),
      user: application.user ?? null,
      tenant: application.tenant ?? null,
    };
  }

  private async getOrThrow(id: string) {
    const application = await this.prisma.partnerApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Partner application not found');
    return application;
  }

  private async getDraftOrThrow(id: string) {
    const application = await this.getOrThrow(id);
    if (application.status !== PartnerApplicationStatus.DRAFT) {
      throw new BadRequestException('Application already submitted');
    }
    return application;
  }

  private generatePassword(): string {
    return `FitOra!${randomBytes(6).toString('base64url')}`;
  }

  private format(application: Prisma.PartnerApplicationGetPayload<object>) {
    return {
      id: application.id,
      status: application.status,
      currentStep: application.currentStep,
      ownerName: application.ownerName,
      businessName: application.businessName,
      phone: application.phone,
      phoneVerified: application.phoneVerified,
      email: application.email,
      city: application.city,
      venueAddress: application.venueAddress,
      state: application.state,
      pincode: application.pincode,
      venue: application.venue,
      sportsConfig: application.sportsConfig,
      trainers: application.trainers,
      legal: application.legal,
      visuals: application.visuals,
      userId: application.userId,
      tenantId: application.tenantId,
      submittedAt: application.submittedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }
}
