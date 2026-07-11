import { Injectable } from '@nestjs/common';
import {
  BookingStatus,
  CourtApprovalStatus,
  EnrollmentStatus,
  PaymentEntityType,
  PaymentStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { MAX_CANDIDATES } from './ai.constants';

type UserContext = {
  id: string;
  roles: UserRole[];
  city?: string;
  preferences?: string;
};

@Injectable()
export class AiContextService {
  constructor(private prisma: PrismaService) {}

  async getUserProfile(userId: string) {
    const [user, bookings, enrollments, purchases, orders] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.booking.findMany({
        where: { userId, deletedAt: null, status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          court: { select: { name: true, city: true, sport: { select: { name: true, slug: true } } } },
        },
      }),
      this.prisma.trainingEnrollment.findMany({
        where: { kid: { parentId: userId }, deletedAt: null, status: EnrollmentStatus.ACTIVE },
        take: 5,
        select: {
          batch: {
            select: {
              name: true,
              program: { select: { name: true, sport: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.membershipPurchase.findMany({
        where: { userId, deletedAt: null, isActive: true },
        take: 5,
        select: { plan: { select: { name: true, court: { select: { name: true, city: true } } } } },
      }),
      this.prisma.shopOrder.findMany({
        where: { userId, deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { items: { select: { product: { select: { name: true, category: { select: { name: true } } } } } } },
      }),
    ]);

    return {
      user,
      recentSports: [...new Set(bookings.map((b) => b.court.sport?.name).filter(Boolean))],
      recentCities: [...new Set(bookings.map((b) => b.court.city))],
      activeMemberships: purchases.map((p) => p.plan.name),
      activeTraining: enrollments.map((e) => e.batch.program.name),
      recentProductCategories: [
        ...new Set(orders.flatMap((o) => o.items.map((i) => i.product.category.name))),
      ],
    };
  }

  async getCourtCandidates(params: { city?: string; sportSlug?: string; search?: string }) {
    const courts = await this.prisma.court.findMany({
      where: {
        deletedAt: null,
        approvalStatus: CourtApprovalStatus.APPROVED,
        isActive: true,
        ...(params.city && { city: { contains: params.city, mode: 'insensitive' } }),
        ...(params.sportSlug && { sport: { slug: params.sportSlug } }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { city: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      take: MAX_CANDIDATES,
      orderBy: [{ averageRating: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        city: true,
        amenities: true,
        defaultSlotPrice: true,
        averageRating: true,
        sport: { select: { name: true, slug: true } },
      },
    });

    return courts.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      sport: c.sport?.name,
      amenities: c.amenities,
      pricePerSlot: c.defaultSlotPrice?.toString() ?? null,
      rating: c.averageRating?.toString() ?? null,
    }));
  }

  async getMembershipCandidates(params: { courtId?: string; city?: string }) {
    const plans = await this.prisma.membershipPlan.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(params.courtId && { courtId: params.courtId }),
        ...(params.city && { court: { city: { contains: params.city, mode: 'insensitive' } } }),
      },
      take: MAX_CANDIDATES,
      orderBy: { price: 'asc' },
      select: {
        id: true,
        name: true,
        duration: true,
        price: true,
        maxBookings: true,
        benefits: true,
        court: { select: { name: true, city: true, sport: { select: { name: true } } } },
      },
    });

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      court: p.court.name,
      city: p.court.city,
      sport: p.court.sport?.name,
      duration: p.duration,
      price: p.price.toString(),
      maxBookings: p.maxBookings,
      benefits: p.benefits,
    }));
  }

  async getTrainingBatchCandidates(params: {
    city?: string;
    sportSlug?: string;
    kidAge?: number;
  }) {
    const batches = await this.prisma.trainingBatch.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(params.city && {
          program: { court: { city: { contains: params.city, mode: 'insensitive' } } },
        }),
        ...(params.sportSlug && { program: { sport: { slug: params.sportSlug } } }),
        ...(params.kidAge !== undefined && {
          program: { minAge: { lte: params.kidAge }, maxAge: { gte: params.kidAge } },
        }),
      },
      take: MAX_CANDIDATES,
      include: {
        program: {
          select: {
            name: true,
            fee: true,
            minAge: true,
            maxAge: true,
            court: { select: { name: true, city: true } },
            sport: { select: { name: true } },
          },
        },
        trainer: { select: { firstName: true, lastName: true } },
        _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
      },
    });

    return batches.map((b) => ({
      id: b.id,
      name: b.name,
      program: b.program.name,
      sport: b.program.sport?.name,
      court: b.program.court.name,
      city: b.program.court.city,
      schedule: b.schedule,
      fee: b.program.fee.toString(),
      ageRange: `${b.program.minAge ?? 0}-${b.program.maxAge ?? 99}`,
      trainer: `${b.trainer.firstName} ${b.trainer.lastName}`,
      enrolled: b._count.enrollments,
      capacity: b.maxCapacity,
      spotsLeft: b.maxCapacity - b._count.enrollments,
    }));
  }

  async getProductCandidates(params: { categorySlug?: string; sportSlug?: string; search?: string }) {
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(params.categorySlug && { category: { slug: params.categorySlug } }),
        ...(params.sportSlug && { sport: { slug: params.sportSlug } }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      take: MAX_CANDIDATES,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isFeatured: true,
        category: { select: { name: true, slug: true } },
        sport: { select: { name: true } },
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price.toString(),
      category: p.category.name,
      sport: p.sport?.name,
      stock: p.stock,
      featured: p.isFeatured,
    }));
  }

  async getServiceCandidates(params: { city?: string; category?: string; search?: string }) {
    const listings = await this.prisma.serviceListing.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(params.city && { city: { contains: params.city, mode: 'insensitive' } }),
        ...(params.category && { category: params.category as never }),
        ...(params.search && {
          OR: [
            { title: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      take: MAX_CANDIDATES,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        price: true,
        city: true,
        turnaroundDays: true,
        provider: { select: { firstName: true, lastName: true } },
      },
    });

    return listings.map((l) => ({
      id: l.id,
      name: l.title,
      title: l.title,
      category: l.category,
      price: l.price.toString(),
      city: l.city,
      turnaroundDays: l.turnaroundDays,
      provider: `${l.provider.firstName} ${l.provider.lastName}`,
    }));
  }

  async getAttendanceContext(params: {
    batchId?: string;
    enrollmentId?: string;
    from?: Date;
    to?: Date;
    userId: string;
    roles: UserRole[];
  }) {
    const dateFilter =
      params.from || params.to
        ? { ...(params.from && { gte: params.from }), ...(params.to && { lte: params.to }) }
        : undefined;

    const enrollments = await this.prisma.trainingEnrollment.findMany({
      where: {
        deletedAt: null,
        ...(params.enrollmentId && { id: params.enrollmentId }),
        ...(params.batchId && { batchId: params.batchId }),
        ...(!params.enrollmentId &&
          !params.batchId &&
          params.roles.includes(UserRole.TRAINER) && {
            batch: { trainerId: params.userId },
          }),
        ...(!params.enrollmentId &&
          !params.batchId &&
          !params.roles.includes(UserRole.TRAINER) &&
          !params.roles.includes(UserRole.ADMIN) && {
            kid: { parentId: params.userId },
          }),
      },
      take: 50,
      include: {
        kid: { select: { firstName: true, lastName: true, dateOfBirth: true } },
        batch: {
          select: {
            id: true,
            name: true,
            schedule: true,
            program: { select: { name: true, sport: { select: { name: true } } } },
          },
        },
        attendances: {
          where: { deletedAt: null, ...(dateFilter && { date: dateFilter }) },
          select: { date: true, present: true, notes: true },
          orderBy: { date: 'desc' },
        },
      },
    });

    return enrollments.map((e) => {
      const total = e.attendances.length;
      const present = e.attendances.filter((a) => a.present).length;
      return {
        enrollmentId: e.id,
        student: `${e.kid.firstName} ${e.kid.lastName}`,
        batch: e.batch.name,
        program: e.batch.program.name,
        sport: e.batch.program.sport?.name,
        schedule: e.batch.schedule,
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : null,
        sessionsRecorded: total,
        presentCount: present,
        recentAbsences: e.attendances.filter((a) => !a.present).slice(0, 5),
      };
    });
  }

  async getCoachPerformanceContext(params: {
    trainerId?: string;
    batchId?: string;
    from?: Date;
    to?: Date;
    userId: string;
    roles: UserRole[];
  }) {
    const trainerId =
      params.trainerId ??
      (params.roles.includes(UserRole.TRAINER) ? params.userId : undefined);

    if (!trainerId) return null;

    const profile = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const batches = await this.prisma.trainingBatch.findMany({
      where: {
        deletedAt: null,
        trainerId,
        ...(params.batchId && { id: params.batchId }),
      },
      include: {
        program: { select: { name: true, sport: { select: { name: true } } } },
        _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
        enrollments: {
          where: { deletedAt: null, status: EnrollmentStatus.ACTIVE },
          take: 20,
          select: {
            attendances: {
              where: { deletedAt: null },
              select: { present: true },
            },
          },
        },
      },
    });

    const leaveRequests = await this.prisma.leaveRequest.count({
      where: { trainerId, deletedAt: null },
    });

    const progressReports = await this.prisma.progressReport.count({
      where: { authorId: trainerId, deletedAt: null },
    });

    return {
      trainer: profile
        ? {
            name: `${profile.user.firstName} ${profile.user.lastName}`,
            bio: profile.bio,
            specializations: profile.specializations,
            averageRating: profile.averageRating?.toString(),
            isVerified: profile.isVerified,
          }
        : { name: 'Trainer', id: trainerId },
      batches: batches.map((b) => {
        const allAttendance = b.enrollments.flatMap((e) => e.attendances);
        const rate =
          allAttendance.length > 0
            ? Math.round(
                (allAttendance.filter((a) => a.present).length / allAttendance.length) * 100,
              )
            : null;
        return {
          id: b.id,
          name: b.name,
          program: b.program.name,
          sport: b.program.sport?.name,
          activeEnrollments: b._count.enrollments,
          capacity: b.maxCapacity,
          utilizationPct: Math.round((b._count.enrollments / b.maxCapacity) * 100),
          batchAttendanceRate: rate,
        };
      }),
      leaveRequestCount: leaveRequests,
      progressReportsSubmitted: progressReports,
    };
  }

  async getRevenueContext(params: {
    from: Date;
    to: Date;
    courtOwnerId?: string;
  }) {
    const dateFilter = { gte: params.from, lte: params.to };

    let ownerEntityFilter:
      | Array<{ entityType: PaymentEntityType; entityId: { in: string[] } }>
      | undefined;

    if (params.courtOwnerId) {
      const courts = await this.prisma.court.findMany({
        where: { ownerId: params.courtOwnerId, deletedAt: null },
        select: { id: true },
      });
      const courtIds = courts.map((c) => c.id);

      const [bookings, membershipPurchases] = await Promise.all([
        this.prisma.booking.findMany({
          where: { courtId: { in: courtIds }, deletedAt: null },
          select: { id: true },
        }),
        this.prisma.membershipPurchase.findMany({
          where: { plan: { courtId: { in: courtIds } }, deletedAt: null },
          select: { id: true },
        }),
      ]);

      ownerEntityFilter = [
        { entityType: PaymentEntityType.BOOKING, entityId: { in: bookings.map((b) => b.id) } },
        { entityType: PaymentEntityType.MEMBERSHIP, entityId: { in: membershipPurchases.map((m) => m.id) } },
      ];
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        deletedAt: null,
        status: PaymentStatus.PAID,
        paidAt: dateFilter,
        ...(ownerEntityFilter && { OR: ownerEntityFilter }),
      },
      select: { amount: true, entityType: true, paidAt: true },
    });

    const [bookings, memberships, shopOrders, trainingEnrollments] = await Promise.all([
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          createdAt: dateFilter,
          ...(params.courtOwnerId && { court: { ownerId: params.courtOwnerId } }),
        },
      }),
      this.prisma.membershipPurchase.count({
        where: {
          deletedAt: null,
          paymentStatus: PaymentStatus.PAID,
          createdAt: dateFilter,
          ...(params.courtOwnerId && { plan: { court: { ownerId: params.courtOwnerId } } }),
        },
      }),
      params.courtOwnerId
        ? Promise.resolve(0)
        : this.prisma.shopOrder.count({
            where: { deletedAt: null, paymentStatus: PaymentStatus.PAID, createdAt: dateFilter },
          }),
      params.courtOwnerId
        ? Promise.resolve(0)
        : this.prisma.trainingEnrollment.count({
            where: { deletedAt: null, paymentStatus: PaymentStatus.PAID, createdAt: dateFilter },
          }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const byEntity = payments.reduce<Record<string, number>>((acc, p) => {
      acc[p.entityType] = (acc[p.entityType] ?? 0) + Number(p.amount);
      return acc;
    }, {});

    return {
      period: { from: params.from.toISOString(), to: params.to.toISOString() },
      totalRevenue,
      revenueByType: byEntity,
      bookingCount: bookings,
      membershipSales: memberships,
      shopOrders: shopOrders,
      trainingEnrollments,
      transactionCount: payments.length,
    };
  }

  buildUserContextBlock(profile: Awaited<ReturnType<typeof this.getUserProfile>>, preferences?: string) {
    return JSON.stringify({
      preferences,
      recentSports: profile.recentSports,
      recentCities: profile.recentCities,
      activeMemberships: profile.activeMemberships,
      activeTraining: profile.activeTraining,
      recentProductCategories: profile.recentProductCategories,
      homeCity: profile.recentCities[0] ?? null,
    });
  }
}
