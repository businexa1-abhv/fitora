import { Injectable, NotFoundException } from '@nestjs/common';
import { CourtApprovalStatus, type Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CacheService } from '../common/redis/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../common/redis/cache.constants';
import { hashQueryParams } from '../common/utils/cursor-pagination.util';
import { optimizeImageUrl } from '../common/utils/cdn.util';
import { resolveSportSlug } from './utils/court.utils';
import { type VenueQueryDto } from './dto/venue-query.dto';

const COURT_INCLUDE = {
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  sport: { select: { id: true, name: true, slug: true, iconUrl: true } },
  images: {
    where: { deletedAt: null },
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
  },
};

@Injectable()
export class VenuesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async findAll(query: VenueQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const courtWhere = await this.buildCourtWhere(query);

    const cacheKey = `${CACHE_PREFIX}venues:list:${hashQueryParams({ ...query })}`;
    return this.cacheService.getOrSet(cacheKey, CACHE_TTL.COURTS_LIST, async () => {
      const grouped = await this.prisma.court.groupBy({
        by: ['tenantId'],
        where: courtWhere,
        _count: { id: true },
        _min: { defaultSlotPrice: true, createdAt: true },
        orderBy: { _min: { createdAt: 'desc' } },
      });

      const total = grouped.length;
      const pageGroups = grouped.slice((page - 1) * pageSize, page * pageSize);
      const tenantIds = pageGroups.map((g) => g.tenantId);

      if (tenantIds.length === 0) {
        return { items: [], total: 0, page, pageSize, totalPages: 0 };
      }

      const [tenants, sampleCourts] = await Promise.all([
        this.prisma.tenant.findMany({
          where: { id: { in: tenantIds }, deletedAt: null },
          select: {
            id: true,
            name: true,
            brandName: true,
            slug: true,
            logoUrl: true,
            status: true,
            isActive: true,
          },
        }),
        this.prisma.court.findMany({
          where: { ...courtWhere, tenantId: { in: tenantIds } },
          include: COURT_INCLUDE,
          orderBy: [{ createdAt: 'asc' }],
        }),
      ]);

      const tenantMap = new Map(tenants.map((t) => [t.id, t]));
      const courtsByTenant = new Map<string, typeof sampleCourts>();
      for (const court of sampleCourts) {
        const list = courtsByTenant.get(court.tenantId) ?? [];
        list.push(court);
        courtsByTenant.set(court.tenantId, list);
      }

      const items = tenantIds
        .map((tenantId) => {
          const tenant = tenantMap.get(tenantId);
          const courts = courtsByTenant.get(tenantId) ?? [];
          if (!tenant || courts.length === 0) return null;
          return this.formatVenue(tenant, courts, false);
        })
        .filter(Boolean);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    });
  }

  /** Admin view: every venue (any tenant status) with all its courts nested. */
  async findAllAdmin(query: { search?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
      courts: { some: { deletedAt: null } },
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { brandName: { contains: query.search, mode: 'insensitive' } },
          { courts: { some: { city: { contains: query.search, mode: 'insensitive' } } } },
        ],
      }),
    };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          brandName: true,
          slug: true,
          logoUrl: true,
          status: true,
          isActive: true,
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          courts: {
            where: { deletedAt: null },
            include: COURT_INCLUDE,
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const items = tenants.map((tenant) => {
      const courts = tenant.courts;
      const approved = courts.filter((c) => c.approvalStatus === CourtApprovalStatus.APPROVED);
      return {
        id: tenant.id,
        name: tenant.brandName || tenant.name,
        brandName: tenant.brandName,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        status: tenant.status,
        isActive: tenant.isActive,
        owner: tenant.owner,
        city: courts[0]?.city ?? null,
        courtCount: courts.length,
        approvedCourtCount: approved.length,
        pendingCourtCount: courts.filter((c) => c.approvalStatus === CourtApprovalStatus.PENDING)
          .length,
        courts: courts.map((court) => ({
          id: court.id,
          name: court.name,
          city: court.city,
          sport: court.sport,
          approvalStatus: court.approvalStatus,
          isActive: court.isActive,
          defaultSlotPrice: court.defaultSlotPrice?.toString() ?? null,
          defaultSlotCapacity: court.defaultSlotCapacity,
          owner: court.owner,
        })),
      };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, sportSlug?: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id,
        deletedAt: null,
        status: TenantStatus.ACTIVE,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        brandName: true,
        slug: true,
        logoUrl: true,
        status: true,
        isActive: true,
      },
    });
    if (!tenant) throw new NotFoundException('Venue not found');

    const sportId = sportSlug
      ? (
          await this.prisma.sport.findFirst({
            where: { slug: sportSlug, deletedAt: null },
            select: { id: true },
          })
        )?.id
      : undefined;
    if (sportSlug && !sportId) throw new NotFoundException('Sport not found at this venue');

    const courts = await this.prisma.court.findMany({
      where: {
        tenantId: id,
        deletedAt: null,
        approvalStatus: CourtApprovalStatus.APPROVED,
        isActive: true,
        ...(sportId && { sportId }),
      },
      include: COURT_INCLUDE,
      orderBy: { name: 'asc' },
    });

    if (courts.length === 0) throw new NotFoundException('Venue not found');

    return this.formatVenue(tenant, courts, true);
  }

  async listVenueSports(venueId: string) {
    await this.assertVenue(venueId);
    const courts = await this.prisma.court.findMany({
      where: {
        tenantId: venueId,
        deletedAt: null,
        approvalStatus: CourtApprovalStatus.APPROVED,
        isActive: true,
      },
      include: { sport: { select: { id: true, name: true, slug: true, iconUrl: true } } },
    });

    const bySport = new Map<
      string,
      {
        sport: { id: string; name: string; slug: string; iconUrl: string | null };
        courtCount: number;
        priceFrom: number | null;
      }
    >();

    for (const court of courts) {
      if (!court.sport) continue;
      const row = bySport.get(court.sport.id) ?? {
        sport: court.sport,
        courtCount: 0,
        priceFrom: null,
      };
      row.courtCount += 1;
      const price = Number(court.defaultSlotPrice);
      if (Number.isFinite(price) && price > 0) {
        row.priceFrom = row.priceFrom == null ? price : Math.min(row.priceFrom, price);
      }
      bySport.set(court.sport.id, row);
    }

    return {
      venueId,
      sports: [...bySport.values()].map((row) => ({
        ...row.sport,
        courtCount: row.courtCount,
        priceFrom: row.priceFrom?.toString() ?? null,
      })),
    };
  }

  async getVenueSportDetail(venueId: string, sportSlug: string) {
    await this.assertVenue(venueId);
    const sport = await this.prisma.sport.findFirst({
      where: { slug: sportSlug, deletedAt: null },
    });
    if (!sport) throw new NotFoundException('Sport not found');

    const courts = await this.prisma.court.findMany({
      where: {
        tenantId: venueId,
        sportId: sport.id,
        deletedAt: null,
        approvalStatus: CourtApprovalStatus.APPROVED,
        isActive: true,
      },
      include: COURT_INCLUDE,
      orderBy: { name: 'asc' },
    });
    if (courts.length === 0) throw new NotFoundException('Sport not offered at this venue');

    const courtIds = courts.map((c) => c.id);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [schedules, membershipCount, trainerCount, availableSlotsToday] = await Promise.all([
      this.prisma.slotSchedule.findMany({
        where: { courtId: { in: courtIds }, deletedAt: null, isActive: true },
        select: {
          startHour: true,
          endHour: true,
          daysOfWeek: true,
          basePrice: true,
        },
      }),
      this.prisma.membershipPlan.count({
        where: { courtId: { in: courtIds }, deletedAt: null, isActive: true },
      }),
      this.prisma.tenantTrainer.count({
        where: { tenantId: venueId, deletedAt: null },
      }),
      this.prisma.courtSlot.count({
        where: {
          courtId: { in: courtIds },
          deletedAt: null,
          operationalState: 'AVAILABLE',
          startTime: { gte: today, lt: tomorrow },
        },
      }),
    ]);

    const prices = courts
      .map((c) => Number(c.defaultSlotPrice))
      .filter((n) => Number.isFinite(n) && n > 0);
    const operatingHours = this.summarizeOperatingHours(schedules);

    return {
      venueId,
      sport: {
        id: sport.id,
        name: sport.name,
        slug: sport.slug,
        iconUrl: sport.iconUrl,
      },
      courtCount: courts.length,
      availableCourts: courts.length,
      availableSlotsToday,
      priceFrom: prices.length ? Math.min(...prices).toString() : null,
      membershipAvailable: membershipCount > 0,
      coachAvailable: trainerCount > 0,
      operatingHours,
      courts: courts.map((court) => ({
        id: court.id,
        name: court.name,
        defaultSlotPrice: court.defaultSlotPrice?.toString() ?? null,
        defaultSlotCapacity: court.defaultSlotCapacity,
        amenities: court.amenities,
        sport: court.sport,
        images: court.images,
      })),
    };
  }

  private async assertVenue(venueId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: venueId,
        deletedAt: null,
        status: TenantStatus.ACTIVE,
        isActive: true,
      },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Venue not found');
    return tenant;
  }

  private summarizeOperatingHours(
    schedules: Array<{ startHour: number; endHour: number; daysOfWeek: number[] }>,
  ) {
    if (schedules.length === 0) return null;
    const startHour = Math.min(...schedules.map((s) => s.startHour));
    const endHour = Math.max(...schedules.map((s) => s.endHour));
    const days = [...new Set(schedules.flatMap((s) => s.daysOfWeek))].sort();
    return { startHour, endHour, daysOfWeek: days };
  }

  private async buildCourtWhere(query: VenueQueryDto): Promise<Prisma.CourtWhereInput> {
    const sportId = await this.resolveSportId(query);
    return {
      deletedAt: null,
      approvalStatus: CourtApprovalStatus.APPROVED,
      isActive: true,
      tenant: { status: TenantStatus.ACTIVE, isActive: true, deletedAt: null },
      ...(query.city && { city: { contains: query.city, mode: 'insensitive' } }),
      ...(sportId && { sportId }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { city: { contains: query.search, mode: 'insensitive' } },
          { address: { contains: query.search, mode: 'insensitive' } },
          {
            tenant: {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { brandName: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
    };
  }

  private async resolveSportId(query: VenueQueryDto): Promise<string | undefined> {
    if (query.sportId) return query.sportId;
    const slug = resolveSportSlug({
      sportSlug: query.sportSlug,
      sportType: query.sportType,
    });
    if (!slug) return undefined;
    const sport = await this.prisma.sport.findFirst({
      where: { slug, deletedAt: null },
    });
    return sport?.id;
  }

  private formatVenue(
    tenant: {
      id: string;
      name: string;
      brandName: string | null;
      slug: string;
      logoUrl: string | null;
      status: TenantStatus;
      isActive: boolean;
    },
    courts: Array<Prisma.CourtGetPayload<{ include: typeof COURT_INCLUDE }>>,
    includeCourts: boolean,
  ) {
    const primary = courts[0];
    const amenities = [...new Set(courts.flatMap((c) => c.amenities ?? []))];
    const sportMap = new Map(
      courts
        .filter((c) => c.sport)
        .map((c) => [
          c.sport!.id,
          {
            id: c.sport!.id,
            name: c.sport!.name,
            slug: c.sport!.slug,
            iconUrl: c.sport!.iconUrl,
          },
        ]),
    );
    const prices = courts
      .map((c) => Number(c.defaultSlotPrice))
      .filter((n) => Number.isFinite(n) && n > 0);
    const priceFrom = prices.length ? Math.min(...prices) : null;
    const images = primary.images.map((img) => ({
      ...img,
      url: optimizeImageUrl(img.url, { width: 800, quality: 80, format: 'webp' }) ?? img.url,
      thumbnailUrl:
        optimizeImageUrl(img.url, { width: 400, quality: 75, format: 'webp' }) ?? img.url,
    }));

    const formattedCourts = courts.map((court) => ({
      ...court,
      latitude: court.latitude?.toString() ?? null,
      longitude: court.longitude?.toString() ?? null,
      defaultSlotPrice: court.defaultSlotPrice?.toString() ?? null,
      averageRating: court.averageRating?.toString() ?? null,
      sportType: court.sport?.slug?.toUpperCase().replace(/-/g, '_') ?? null,
      images: court.images.map((img) => ({
        ...img,
        url: optimizeImageUrl(img.url, { width: 800, quality: 80, format: 'webp' }) ?? img.url,
        thumbnailUrl:
          optimizeImageUrl(img.url, { width: 400, quality: 75, format: 'webp' }) ?? img.url,
      })),
    }));

    return {
      id: tenant.id,
      name: tenant.brandName || tenant.name,
      brandName: tenant.brandName,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      status: tenant.status,
      isActive: tenant.isActive,
      address: primary.address,
      city: primary.city,
      state: primary.state,
      pincode: primary.pincode,
      latitude: primary.latitude?.toString() ?? null,
      longitude: primary.longitude?.toString() ?? null,
      amenities,
      sports: [...sportMap.values()],
      courtCount: courts.length,
      priceFrom: priceFrom?.toString() ?? null,
      images,
      ...(includeCourts ? { courts: formattedCourts } : {}),
    };
  }
}
