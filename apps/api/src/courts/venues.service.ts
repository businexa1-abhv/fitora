import { Injectable, NotFoundException } from '@nestjs/common';
import { CourtApprovalStatus, type Prisma, TenantStatus } from '@prisma/client';
import { type PrismaService } from '../prisma/prisma.module';
import { type CacheService } from '../common/redis/cache.service';
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

  async findOne(id: string) {
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

    const courts = await this.prisma.court.findMany({
      where: {
        tenantId: id,
        deletedAt: null,
        approvalStatus: CourtApprovalStatus.APPROVED,
        isActive: true,
      },
      include: COURT_INCLUDE,
      orderBy: { name: 'asc' },
    });

    if (courts.length === 0) throw new NotFoundException('Venue not found');

    return this.formatVenue(tenant, courts, true);
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
