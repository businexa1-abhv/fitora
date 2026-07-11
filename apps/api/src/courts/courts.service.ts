import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CourtApprovalStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CacheService } from '../common/redis/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/redis/cache.constants';
import { optimizeImageUrl } from '../common/utils/cdn.util';
import { hashQueryParams } from '../common/utils/cursor-pagination.util';
import { TenantsService } from '../tenants/tenants.service';
import { COURT_AMENITIES } from './constants/court.constants';
import {
  AddCourtImageDto,
  CourtQueryDto,
  CreateCourtDto,
  RejectCourtDto,
  ResubmitCourtDto,
  UpdateCourtDto,
  UpdateCourtImageDto,
} from './dto';
import {
  generateUniqueCourtSlug,
  resolveSportId,
  resolveSportSlug,
  validateAmenities,
  validateCoordinates,
  validatePincode,
} from './utils/court.utils';

const COURT_INCLUDE = {
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  sport: { select: { id: true, name: true, slug: true, iconUrl: true } },
  images: {
    where: { deletedAt: null },
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
  },
};

type CourtWithRelations = Prisma.CourtGetPayload<{ include: typeof COURT_INCLUDE }>;

@Injectable()
export class CourtsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private tenantsService: TenantsService,
  ) {}

  // ─── Sports & amenities ───────────────────────────────────────────────────

  listSports() {
    return this.cacheService.getOrSet(CACHE_KEYS.sports(), CACHE_TTL.SPORTS, () =>
      this.prisma.sport.findMany({
        where: { deletedAt: null, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, slug: true, iconUrl: true, description: true },
      }),
    );
  }

  getAmenities() {
    return { items: [...COURT_AMENITIES] };
  }

  // ─── Court CRUD ───────────────────────────────────────────────────────────

  async create(dto: CreateCourtDto, ownerId: string) {
    const sportId = await resolveSportId(this.prisma, dto);
    validateAmenities(dto.amenities ?? []);
    validateCoordinates(dto.latitude, dto.longitude);
    validatePincode(dto.pincode);

    const tenant = await this.tenantsService.createForCourtOwner(ownerId, dto.name);
    const slug = await generateUniqueCourtSlug(this.prisma, dto.name, dto.city, tenant.id);
    const { images, sportSlug: _s, sportType: _t, sportId: _id, ...rest } = dto;

    const court = await this.prisma.court.create({
      data: {
        ...rest,
        slug,
        sportId,
        ownerId,
        tenantId: tenant.id,
        amenities: dto.amenities ?? [],
        latitude: dto.latitude,
        longitude: dto.longitude,
        defaultSlotPrice: dto.defaultSlotPrice,
        approvalStatus: CourtApprovalStatus.PENDING,
        isApproved: false,
        images: images?.length
          ? {
              create: images.map((img, index) => ({
                url: img.url,
                altText: img.altText,
                sortOrder: img.sortOrder ?? index,
                isPrimary: img.isPrimary ?? index === 0,
              })),
            }
          : undefined,
      },
      include: COURT_INCLUDE,
    });

    await this.logAudit(ownerId, AuditAction.CREATE, court.id, undefined, court);
    return this.formatCourt(court);
  }

  async findAll(query: CourtQueryDto, user?: AuthUserPayload) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const isAdmin = user?.roles.includes(UserRole.ADMIN);

    const where: Prisma.CourtWhereInput = {
      deletedAt: null,
      ...(query.city && { city: { contains: query.city, mode: 'insensitive' } }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { city: { contains: query.search, mode: 'insensitive' } },
          { address: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.approvalStatus && isAdmin && { approvalStatus: query.approvalStatus }),
      ...(!isAdmin && {
        approvalStatus: CourtApprovalStatus.APPROVED,
        isActive: true,
      }),
      ...(isAdmin && query.includeInactive === false && { isActive: true }),
    };

    const sportFilter = await this.buildSportFilter(query);
    if (sportFilter) where.sportId = sportFilter;

    const tenantId = this.tenantsService.resolveTenantIdFromContext();
    if (tenantId) where.tenantId = tenantId;

    const cacheKey = CACHE_KEYS.courtsList(
      hashQueryParams({ ...query, isAdmin: !!isAdmin, userId: user?.id }),
    );

    return this.cacheService.getOrSet(cacheKey, CACHE_TTL.COURTS_LIST, async () => {
      const [items, total] = await Promise.all([
        this.prisma.court.findMany({
          where,
          include: COURT_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.court.count({ where }),
      ]);

      return {
        items: items.map((c) => this.formatCourt(c)),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    });
  }

  async findPending(page = 1, pageSize = 20) {
    const where = { deletedAt: null, approvalStatus: CourtApprovalStatus.PENDING };
    const [items, total] = await Promise.all([
      this.prisma.court.findMany({
        where,
        include: COURT_INCLUDE,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.court.count({ where }),
    ]);
    return {
      items: items.map((c) => this.formatCourt(c)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findMine(ownerId: string, page = 1, pageSize = 20) {
    const where = { ownerId, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.court.findMany({
        where,
        include: COURT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.court.count({ where }),
    ]);
    return {
      items: items.map((c) => this.formatCourt(c)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, user?: AuthUserPayload) {
    const court = await this.prisma.court.findFirst({
      where: { id, deletedAt: null },
      include: COURT_INCLUDE,
    });

    if (!court) throw new NotFoundException('Court not found');

    const isAdmin = user?.roles.includes(UserRole.ADMIN);
    const isOwner = user?.id === court.ownerId;

    if (court.approvalStatus !== CourtApprovalStatus.APPROVED && !isAdmin && !isOwner) {
      throw new NotFoundException('Court not found');
    }

    if (!court.isActive && !isAdmin && !isOwner) {
      throw new NotFoundException('Court not found');
    }

    return this.formatCourt(court);
  }

  async update(id: string, dto: UpdateCourtDto, user: AuthUserPayload) {
    const court = await this.getCourtEntity(id);
    this.assertOwnerOrAdmin(court.ownerId, user);

    if (dto.amenities) validateAmenities(dto.amenities);
    validateCoordinates(dto.latitude, dto.longitude);
    validatePincode(dto.pincode);

    const data: Prisma.CourtUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.pincode !== undefined) data.pincode = dto.pincode;
    if (dto.rules !== undefined) data.rules = dto.rules;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.defaultSlotPrice !== undefined) data.defaultSlotPrice = dto.defaultSlotPrice;
    if (dto.amenities !== undefined) data.amenities = dto.amenities;

    if (dto.sportId || dto.sportSlug || dto.sportType) {
      data.sport = { connect: { id: await resolveSportId(this.prisma, dto) } };
    }

    if (
      court.approvalStatus === CourtApprovalStatus.REJECTED &&
      !user.roles.includes(UserRole.ADMIN)
    ) {
      data.approvalStatus = CourtApprovalStatus.PENDING;
      data.rejectionReason = null;
      data.rejectedAt = null;
      data.isApproved = false;
    }

    const updated = await this.prisma.court.update({
      where: { id },
      data,
      include: COURT_INCLUDE,
    });

    await this.logAudit(user.id, AuditAction.UPDATE, id, court, updated);
    return this.formatCourt(updated);
  }

  async remove(id: string, user: AuthUserPayload) {
    const court = await this.getCourtEntity(id);
    this.assertOwnerOrAdmin(court.ownerId, user);

    const deleted = await this.prisma.court.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      include: COURT_INCLUDE,
    });

    await this.logAudit(user.id, AuditAction.DELETE, id, court, deleted);
    return { success: true, id };
  }

  // ─── Approval workflow ──────────────────────────────────────────────────────

  async approve(id: string, adminId: string) {
    const court = await this.getCourtEntity(id);

    if (court.approvalStatus === CourtApprovalStatus.APPROVED) {
      throw new BadRequestException('Court is already approved');
    }

    const updated = await this.prisma.court.update({
      where: { id },
      data: {
        approvalStatus: CourtApprovalStatus.APPROVED,
        isApproved: true,
        isActive: true,
        approvedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null,
      },
      include: COURT_INCLUDE,
    });

    await this.logAudit(adminId, AuditAction.APPROVE, id, court, updated);
    return this.formatCourt(updated);
  }

  async reject(id: string, dto: RejectCourtDto, adminId: string) {
    const court = await this.getCourtEntity(id);

    const updated = await this.prisma.court.update({
      where: { id },
      data: {
        approvalStatus: CourtApprovalStatus.REJECTED,
        isApproved: false,
        isActive: false,
        rejectionReason: dto.reason,
        rejectedAt: new Date(),
        approvedAt: null,
      },
      include: COURT_INCLUDE,
    });

    await this.logAudit(adminId, AuditAction.REJECT, id, court, updated);
    return this.formatCourt(updated);
  }

  async resubmit(id: string, dto: ResubmitCourtDto, user: AuthUserPayload) {
    const court = await this.getCourtEntity(id);
    this.assertOwnerOrAdmin(court.ownerId, user);

    if (court.approvalStatus !== CourtApprovalStatus.REJECTED) {
      throw new BadRequestException('Only rejected courts can be resubmitted');
    }

    const updated = await this.prisma.court.update({
      where: { id },
      data: {
        approvalStatus: CourtApprovalStatus.PENDING,
        isApproved: false,
        rejectionReason: dto.note ?? null,
        rejectedAt: null,
        approvedAt: null,
      },
      include: COURT_INCLUDE,
    });

    await this.logAudit(user.id, AuditAction.STATUS_CHANGE, id, court, updated);
    return this.formatCourt(updated);
  }

  // ─── Images ─────────────────────────────────────────────────────────────────

  async addImage(courtId: string, dto: AddCourtImageDto, user: AuthUserPayload) {
    const court = await this.getCourtEntity(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);

    if (dto.isPrimary) {
      await this.prisma.courtImage.updateMany({
        where: { courtId, deletedAt: null },
        data: { isPrimary: false },
      });
    }

    const image = await this.prisma.courtImage.create({
      data: {
        courtId,
        url: dto.url,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary: dto.isPrimary ?? false,
      },
    });

    return image;
  }

  async updateImage(
    courtId: string,
    imageId: string,
    dto: UpdateCourtImageDto,
    user: AuthUserPayload,
  ) {
    const court = await this.getCourtEntity(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);
    await this.getImageEntity(courtId, imageId);

    if (dto.isPrimary) {
      await this.prisma.courtImage.updateMany({
        where: { courtId, deletedAt: null },
        data: { isPrimary: false },
      });
    }

    return this.prisma.courtImage.update({
      where: { id: imageId },
      data: dto,
    });
  }

  async removeImage(courtId: string, imageId: string, user: AuthUserPayload) {
    const court = await this.getCourtEntity(courtId);
    this.assertOwnerOrAdmin(court.ownerId, user);
    await this.getImageEntity(courtId, imageId);

    await this.prisma.courtImage.update({
      where: { id: imageId },
      data: { deletedAt: new Date() },
    });

    return { success: true, id: imageId };
  }

  async setPrimaryImage(courtId: string, imageId: string, user: AuthUserPayload) {
    return this.updateImage(courtId, imageId, { isPrimary: true }, user);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getCourtEntity(id: string) {
    const court = await this.prisma.court.findFirst({ where: { id, deletedAt: null } });
    if (!court) throw new NotFoundException('Court not found');
    return court;
  }

  private async getImageEntity(courtId: string, imageId: string) {
    const image = await this.prisma.courtImage.findFirst({
      where: { id: imageId, courtId, deletedAt: null },
    });
    if (!image) throw new NotFoundException('Image not found');
    return image;
  }

  private async buildSportFilter(query: CourtQueryDto): Promise<string | undefined> {
    if (query.sportId) return query.sportId;
    const slug = resolveSportSlug(query);
    if (!slug) return undefined;
    const sport = await this.prisma.sport.findFirst({
      where: { slug, deletedAt: null },
    });
    return sport?.id;
  }

  private formatCourt(court: CourtWithRelations) {
    return {
      ...court,
      latitude: court.latitude?.toString() ?? null,
      longitude: court.longitude?.toString() ?? null,
      defaultSlotPrice: court.defaultSlotPrice?.toString() ?? null,
      averageRating: court.averageRating?.toString() ?? null,
      sportType: court.sport?.slug?.toUpperCase().replace(/-/g, '_') ?? null,
      images: court.images.map((img) => ({
        ...img,
        url: optimizeImageUrl(img.url, { width: 800, quality: 80, format: 'webp' }) ?? img.url,
        thumbnailUrl: optimizeImageUrl(img.url, { width: 400, quality: 75, format: 'webp' }) ?? img.url,
      })),
    };
  }

  private assertOwnerOrAdmin(ownerId: string, user: AuthUserPayload) {
    if (user.roles.includes(UserRole.ADMIN) || user.id === ownerId) return;
    throw new ForbiddenException('You do not have permission to manage this court');
  }

  private async logAudit(
    actorId: string,
    action: AuditAction,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'court',
        entityId,
        before: before ? (before as Prisma.InputJsonValue) : undefined,
        after: after ? (after as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}
