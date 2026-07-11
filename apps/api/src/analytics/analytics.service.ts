import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  CourtApprovalStatus,
  PaymentEntityType,
  PaymentStatus,
  ShopOrderStatus,
} from '@prisma/client';
import { CacheService } from '../common/redis/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/redis/cache.constants';
import { PrismaService } from '../prisma/prisma.module';
import { TenantsService } from '../tenants/tenants.service';
import { PAYMENT_ENTITY_LABELS } from '../payments/payments.constants';
import {
  AnalyticsPeriod,
  aggregateToSeries,
  countToSeries,
  pctChange,
  resolveDateRange,
} from './analytics.constants';

type QueryParams = {
  period?: AnalyticsPeriod;
  from?: string;
  to?: string;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private configService: ConfigService,
    private tenantsService: TenantsService,
  ) {}

  async getDashboard(params: QueryParams) {
    const period = params.period ?? AnalyticsPeriod.MONTHLY;
    const cacheEnabled = this.configService.get<boolean>('CACHE_ENABLED', true);

    const cacheKey = CACHE_KEYS.analyticsDashboard(period, params.from, params.to);

    if (cacheEnabled) {
      return this.cacheService.getOrSet(cacheKey, CACHE_TTL.ANALYTICS_DASHBOARD, () =>
        this.computeDashboard(params),
      );
    }

    return this.computeDashboard(params);
  }

  private async computeDashboard(params: QueryParams) {
    const period = params.period ?? AnalyticsPeriod.MONTHLY;
    const { start, end } = resolveDateRange(period, params.from, params.to);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(start);
    const spanMs = end.getTime() - start.getTime();
    prevStart.setTime(prevStart.getTime() - spanMs);

    const [
      revenue,
      bookings,
      memberships,
      products,
      users,
      growth,
      retention,
      overview,
    ] = await Promise.all([
      this.getRevenue(period, start, end),
      this.getBookings(period, start, end),
      this.getMemberships(period, start, end),
      this.getProducts(period, start, end),
      this.getUsers(period, start, end),
      this.getGrowth(start, end, prevStart, prevEnd),
      this.getRetention(start, end),
      this.getOverview(start, end),
    ]);

    return {
      period,
      range: { from: start.toISOString(), to: end.toISOString() },
      overview,
      revenue,
      bookings,
      memberships,
      products,
      users,
      growth,
      retention,
    };
  }

  async getOverview(start: Date, end: Date) {
    const dateFilter = { gte: start, lte: end };

    const [paidPayments, bookings, newUsers, activeMemberships, shopOrders, activeCourts, pendingCourts] =
      await Promise.all([
        this.prisma.payment.findMany({
          where: { deletedAt: null, status: PaymentStatus.PAID, paidAt: dateFilter },
          select: { amount: true },
        }),
        this.prisma.booking.count({
          where: {
            deletedAt: null,
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
            createdAt: dateFilter,
          },
        }),
        this.prisma.user.count({ where: { deletedAt: null, createdAt: dateFilter } }),
        this.prisma.membershipPurchase.count({
          where: { deletedAt: null, isActive: true, paymentStatus: PaymentStatus.PAID },
        }),
        this.prisma.shopOrder.count({
          where: {
            deletedAt: null,
            paymentStatus: PaymentStatus.PAID,
            status: { not: ShopOrderStatus.CANCELLED },
            createdAt: dateFilter,
          },
        }),
        this.prisma.court.count({ where: { deletedAt: null, isApproved: true } }),
        this.prisma.court.count({
          where: { deletedAt: null, approvalStatus: CourtApprovalStatus.PENDING },
        }),
      ]);

    const totalRevenue = paidPayments.reduce((s, p) => s + Number(p.amount), 0);

    return {
      totalRevenue,
      totalBookings: bookings,
      newUsers,
      activeMemberships,
      shopOrders,
      activeCourts,
      pendingCourts,
    };
  }

  async getRevenue(period: AnalyticsPeriod, start: Date, end: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        deletedAt: null,
        status: PaymentStatus.PAID,
        paidAt: { gte: start, lte: end },
      },
      select: { amount: true, entityType: true, paidAt: true, createdAt: true },
    });

    const series = aggregateToSeries(
      payments.map((p) => ({ ...p, createdAt: p.paidAt ?? p.createdAt })),
      period,
      start,
      end,
      (p) => Number(p.amount),
    );

    const byEntityType = Object.values(PaymentEntityType)
      .map((type) => {
        const rows = payments.filter((p) => p.entityType === type);
        return {
          entityType: type,
          label: PAYMENT_ENTITY_LABELS[type],
          revenue: rows.reduce((s, p) => s + Number(p.amount), 0),
          count: rows.length,
        };
      })
      .filter((r) => r.count > 0);

    return {
      total: payments.reduce((s, p) => s + Number(p.amount), 0),
      series,
      byEntityType,
    };
  }

  async getBookings(period: AnalyticsPeriod, start: Date, end: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, totalAmount: true, courtId: true },
    });

    const series = countToSeries(bookings, period, start, end);
    const revenueSeries = aggregateToSeries(
      bookings,
      period,
      start,
      end,
      (b) => Number(b.totalAmount),
    );

    return {
      total: bookings.length,
      totalAmount: bookings.reduce((s, b) => s + Number(b.totalAmount), 0),
      series,
      revenueSeries,
    };
  }

  async getMemberships(period: AnalyticsPeriod, start: Date, end: Date) {
    const purchases = await this.prisma.membershipPurchase.findMany({
      where: {
        deletedAt: null,
        paymentStatus: PaymentStatus.PAID,
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, amountPaid: true, isActive: true },
    });

    const series = countToSeries(purchases, period, start, end);
    const active = purchases.filter((p) => p.isActive).length;

    return {
      total: purchases.length,
      active,
      revenue: purchases.reduce((s, p) => s + Number(p.amountPaid), 0),
      series,
    };
  }

  async getProducts(period: AnalyticsPeriod, start: Date, end: Date) {
    const orders = await this.prisma.shopOrder.findMany({
      where: {
        deletedAt: null,
        paymentStatus: PaymentStatus.PAID,
        status: { not: ShopOrderStatus.CANCELLED },
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, totalAmount: true },
    });

    const topProducts = await this.prisma.shopOrderItem.groupBy({
      by: ['productName'],
      where: {
        order: {
          deletedAt: null,
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5,
    });

    return {
      totalOrders: orders.length,
      revenue: orders.reduce((s, o) => s + Number(o.totalAmount), 0),
      series: countToSeries(orders, period, start, end),
      topProducts: topProducts.map((p) => ({
        name: p.productName,
        quantity: p._sum.quantity ?? 0,
        revenue: Number(p._sum.lineTotal ?? 0),
      })),
    };
  }

  async getUsers(period: AnalyticsPeriod, start: Date, end: Date) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    });

    const totalUsers = await this.prisma.user.count({ where: { deletedAt: null, isActive: true } });

    return {
      newUsers: users.length,
      totalUsers,
      series: countToSeries(users, period, start, end),
    };
  }

  async getGrowth(start: Date, end: Date, prevStart: Date, prevEnd: Date) {
    const [currRevenue, prevRevenue, currBookings, prevBookings, currUsers, prevUsers] =
      await Promise.all([
        this.sumRevenue(start, end),
        this.sumRevenue(prevStart, prevEnd),
        this.countBookings(start, end),
        this.countBookings(prevStart, prevEnd),
        this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: start, lte: end } } }),
        this.prisma.user.count({
          where: { deletedAt: null, createdAt: { gte: prevStart, lte: prevEnd } },
        }),
      ]);

    return {
      revenue: { current: currRevenue, previous: prevRevenue, changePct: pctChange(currRevenue, prevRevenue) },
      bookings: { current: currBookings, previous: prevBookings, changePct: pctChange(currBookings, prevBookings) },
      users: { current: currUsers, previous: prevUsers, changePct: pctChange(currUsers, prevUsers) },
    };
  }

  async getRetention(start: Date, end: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        createdAt: { gte: start, lte: end },
      },
      select: { userId: true },
    });

    const userBookingCounts = new Map<string, number>();
    for (const b of bookings) {
      userBookingCounts.set(b.userId, (userBookingCounts.get(b.userId) ?? 0) + 1);
    }

    const uniqueUsers = userBookingCounts.size;
    const repeatUsers = [...userBookingCounts.values()].filter((c) => c >= 2).length;

    const paidUsers = await this.prisma.payment.groupBy({
      by: ['userId'],
      where: {
        deletedAt: null,
        status: PaymentStatus.PAID,
        paidAt: { gte: start, lte: end },
      },
    });

    return {
      bookingRetentionRate: uniqueUsers > 0 ? Math.round((repeatUsers / uniqueUsers) * 1000) / 10 : 0,
      repeatBookers: repeatUsers,
      uniqueBookers: uniqueUsers,
      payingUsers: paidUsers.length,
    };
  }

  exportCsv(metric: string, params: QueryParams): Promise<string> {
    return this.buildExport(metric, params);
  }

  async getOwnerDashboard(ownerId: string, params?: QueryParams) {
    const period = params?.period ?? AnalyticsPeriod.MONTHLY;
    const { start, end } = resolveDateRange(period, params?.from, params?.to);
    const tenantId = this.tenantsService.resolveTenantIdFromContext();

    const courts = await this.prisma.court.findMany({
      where: {
        deletedAt: null,
        ...(tenantId ? { tenantId } : { ownerId }),
      },
      select: { id: true, name: true, isApproved: true, approvalStatus: true, tenantId: true },
    });
    const courtIds = courts.map((c) => c.id);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const courtFilter = courtIds.length > 0 ? { courtId: { in: courtIds } } : { courtId: '__none__' };

    const [
      bookingsMtd,
      bookingsToday,
      activeMembers,
      recentBookings,
      bookingRevenueAgg,
      membershipRevenueAgg,
      trainingRevenueAgg,
      monthlyBookingRevenue,
      monthlyMembershipRevenue,
    ] = await Promise.all([
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          ...courtFilter,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          ...courtFilter,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.membershipPurchase.count({
        where: {
          deletedAt: null,
          isActive: true,
          paymentStatus: PaymentStatus.PAID,
          endDate: { gt: new Date() },
          plan: { courtId: { in: courtIds.length ? courtIds : ['__none__'] } },
        },
      }),
      this.prisma.booking.findMany({
        where: { deletedAt: null, ...courtFilter },
        include: {
          user: { select: { firstName: true, lastName: true } },
          court: { select: { name: true } },
          slot: { select: { startTime: true, endTime: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.booking.aggregate({
        where: {
          deletedAt: null,
          ...courtFilter,
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.membershipPurchase.aggregate({
        where: {
          deletedAt: null,
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: start, lte: end },
          plan: { courtId: { in: courtIds.length ? courtIds : ['__none__'] } },
        },
        _sum: { amountPaid: true },
      }),
      this.prisma.trainingEnrollment.aggregate({
        where: {
          deletedAt: null,
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: start, lte: end },
          batch: { program: { courtId: { in: courtIds.length ? courtIds : ['__none__'] } } },
        },
        _sum: { amountPaid: true },
      }),
      this.prisma.booking.groupBy({
        by: ['createdAt'],
        where: {
          deletedAt: null,
          ...courtFilter,
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.membershipPurchase.groupBy({
        by: ['createdAt'],
        where: {
          deletedAt: null,
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) },
          plan: { courtId: { in: courtIds.length ? courtIds : ['__none__'] } },
        },
        _sum: { amountPaid: true },
      }),
    ]);

    const bookingRevenue = Number(bookingRevenueAgg._sum.totalAmount ?? 0);
    const membershipRevenue = Number(membershipRevenueAgg._sum.amountPaid ?? 0);
    const trainingRevenue = Number(trainingRevenueAgg._sum.amountPaid ?? 0);
    const totalRevenue = bookingRevenue + membershipRevenue + trainingRevenue;

    const monthlyMap = new Map<string, number>();
    for (const row of [...monthlyBookingRevenue, ...monthlyMembershipRevenue]) {
      const key = row.createdAt.toISOString().slice(0, 7);
      const amount =
        Number('totalAmount' in row._sum ? row._sum.totalAmount ?? 0 : row._sum.amountPaid ?? 0);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + amount);
    }
    const monthlyTrend = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(`${month}-01`).toLocaleString('en', { month: 'short' }),
        amount,
      }));

    const approvedCourts = courts.filter((c) => c.isApproved).length;
    const pendingCourts = courts.length - approvedCourts;

    return {
      period,
      range: { from: start.toISOString(), to: end.toISOString() },
      stats: {
        revenueMtd: totalRevenue,
        bookingsToday,
        bookingsMtd,
        activeCourts: approvedCourts,
        pendingCourts,
        activeMembers,
      },
      revenueBreakdown: [
        { source: 'Court bookings', amount: bookingRevenue, share: totalRevenue ? Math.round((bookingRevenue / totalRevenue) * 100) : 0 },
        { source: 'Memberships', amount: membershipRevenue, share: totalRevenue ? Math.round((membershipRevenue / totalRevenue) * 100) : 0 },
        { source: 'Kids training', amount: trainingRevenue, share: totalRevenue ? Math.round((trainingRevenue / totalRevenue) * 100) : 0 },
      ],
      monthlyTrend,
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        userName: `${b.user.firstName} ${b.user.lastName}`,
        courtName: b.court.name,
        time: b.slot.startTime.toISOString(),
        amount: Number(b.totalAmount),
        status: b.status,
      })),
      courts,
    };
  }

  async exportOwnerCsv(ownerId: string, metric: string, params?: QueryParams) {
    const dashboard = await this.getOwnerDashboard(ownerId, params);

    if (metric === 'bookings') {
      const rows = [['User', 'Court', 'Time', 'Amount', 'Status'], ...dashboard.recentBookings.map((b) => [
        b.userName,
        b.courtName,
        b.time,
        String(b.amount),
        b.status,
      ])];
      return rows.map((r) => r.join(',')).join('\n');
    }

    if (metric === 'revenue') {
      const rows = [['Source', 'Amount', 'Share %'], ...dashboard.revenueBreakdown.map((r) => [
        r.source,
        String(r.amount),
        String(r.share),
      ])];
      return rows.map((r) => r.join(',')).join('\n');
    }

    const rows = [
      ['Metric', 'Value'],
      ['Revenue MTD', String(dashboard.stats.revenueMtd)],
      ['Bookings Today', String(dashboard.stats.bookingsToday)],
      ['Active Members', String(dashboard.stats.activeMembers)],
      ['Active Courts', String(dashboard.stats.activeCourts)],
    ];
    return rows.map((r) => r.join(',')).join('\n');
  }

  private async buildExport(metric: string, params: QueryParams): Promise<string> {
    const period = params.period ?? AnalyticsPeriod.MONTHLY;
    const { start, end } = resolveDateRange(period, params.from, params.to);
    const dashboard = await this.getDashboard({ ...params, period });

    if (metric === 'revenue') {
      const rows = [['Period', 'Revenue'], ...dashboard.revenue.series.map((s) => [s.label, String(s.value)])];
      return rows.map((r) => r.join(',')).join('\n');
    }

    if (metric === 'bookings') {
      const rows = [['Period', 'Bookings'], ...dashboard.bookings.series.map((s) => [s.label, String(s.value)])];
      return rows.map((r) => r.join(',')).join('\n');
    }

    if (metric === 'users') {
      const rows = [['Period', 'New Users'], ...dashboard.users.series.map((s) => [s.label, String(s.value)])];
      return rows.map((r) => r.join(',')).join('\n');
    }

    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', String(dashboard.overview.totalRevenue)],
      ['Total Bookings', String(dashboard.overview.totalBookings)],
      ['New Users', String(dashboard.overview.newUsers)],
      ['Active Memberships', String(dashboard.overview.activeMemberships)],
      ['Shop Orders', String(dashboard.overview.shopOrders)],
      ['Retention Rate %', String(dashboard.retention.bookingRetentionRate)],
    ];
    return rows.map((r) => r.join(',')).join('\n');
  }

  private async sumRevenue(start: Date, end: Date) {
    const result = await this.prisma.payment.aggregate({
      where: {
        deletedAt: null,
        status: PaymentStatus.PAID,
        paidAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  private async countBookings(start: Date, end: Date) {
    return this.prisma.booking.count({
      where: {
        deletedAt: null,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        createdAt: { gte: start, lte: end },
      },
    });
  }
}
