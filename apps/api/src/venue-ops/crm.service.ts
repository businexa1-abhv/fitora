import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentEntityType } from '@prisma/client';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.module';
import {
  CreatePlayerNoteDto,
  CrmPlayerSearchQueryDto,
  UpsertPlayerCrmProfileDto,
} from './dto/venue-ops.dto';
import { resolveTenant } from './tenant-access.helper';
import { formatCrmProfile, formatPlayerNote, toNumber } from './venue-ops.mapper';

@Injectable()
export class CrmService {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
  ) {}

  async listPlayers(user: AuthUserPayload, query: CrmPlayerSearchQueryDto) {
    const tenant = await resolveTenant(this.prisma, user);
    const search = query.search?.trim();

    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        court: { tenantId: tenant.id },
        ...(search
          ? {
              user: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        court: { select: { name: true } },
        slot: { select: { startTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const playerMap = new Map<
      string,
      {
        userId: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        bookingCount: number;
        lastBookingAt: string | null;
        courtNames: Set<string>;
      }
    >();

    for (const booking of bookings) {
      const existing = playerMap.get(booking.userId) ?? {
        userId: booking.userId,
        firstName: booking.user.firstName,
        lastName: booking.user.lastName,
        email: booking.user.email,
        phone: booking.user.phone,
        bookingCount: 0,
        lastBookingAt: null,
        courtNames: new Set<string>(),
      };
      existing.bookingCount += 1;
      existing.courtNames.add(booking.court.name);
      const slotTime = booking.slot.startTime.toISOString();
      if (!existing.lastBookingAt || slotTime > existing.lastBookingAt) {
        existing.lastBookingAt = slotTime;
      }
      playerMap.set(booking.userId, existing);
    }

    return Array.from(playerMap.values())
      .map((player) => ({
        userId: player.userId,
        firstName: player.firstName,
        lastName: player.lastName,
        email: player.email,
        phone: player.phone,
        bookingCount: player.bookingCount,
        lastBookingAt: player.lastBookingAt,
        courtNames: Array.from(player.courtNames).sort(),
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount);
  }

  async getPlayer(userId: string, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    await this.assertPlayerOnTenant(userId, tenant.id);

    const player = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!player) throw new NotFoundException('Player not found');

    const [
      bookings,
      memberships,
      invoices,
      trainingEnrollments,
      attendanceCount,
      notes,
      crmProfile,
    ] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId, deletedAt: null, court: { tenantId: tenant.id } },
        include: {
          court: { select: { id: true, name: true } },
          slot: { select: { startTime: true, endTime: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.membershipPurchase.findMany({
        where: {
          userId,
          deletedAt: null,
          plan: { court: { tenantId: tenant.id } },
        },
        include: {
          plan: { select: { id: true, name: true, court: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.listPlayerInvoices(userId, tenant.id),
      this.listTrainingEnrollments(userId, tenant.id),
      this.countAttendance(userId, tenant.id),
      this.prisma.playerNote.findMany({
        where: { tenantId: tenant.id, playerUserId: userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.playerCrmProfile.findFirst({
        where: { tenantId: tenant.id, userId, deletedAt: null },
      }),
    ]);

    return {
      user: player,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: toNumber(booking.totalAmount),
        court: booking.court,
        slot: {
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
        },
        createdAt: booking.createdAt,
      })),
      memberships: memberships.map((purchase) => ({
        id: purchase.id,
        isActive: purchase.isActive,
        paymentStatus: purchase.paymentStatus,
        amountPaid: toNumber(purchase.amountPaid),
        startDate: purchase.startDate,
        endDate: purchase.endDate,
        plan: purchase.plan,
        createdAt: purchase.createdAt,
      })),
      invoices,
      trainingEnrollments,
      attendanceSummary: { totalSessions: attendanceCount },
      notes: notes.map(formatPlayerNote),
      crmProfile: formatCrmProfile(crmProfile),
    };
  }

  async upsertProfile(userId: string, dto: UpsertPlayerCrmProfileDto, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    await this.assertPlayerOnTenant(userId, tenant.id);

    const profile = await this.prisma.playerCrmProfile.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId } },
      create: {
        tenantId: tenant.id,
        userId,
        medicalNotes: dto.medicalNotes,
        skillLevel: dto.skillLevel,
        skillNotes: dto.skillNotes,
      },
      update: {
        medicalNotes: dto.medicalNotes,
        skillLevel: dto.skillLevel,
        skillNotes: dto.skillNotes,
        deletedAt: null,
      },
    });
    return formatCrmProfile(profile);
  }

  async listNotes(userId: string, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    await this.assertPlayerOnTenant(userId, tenant.id);

    const notes = await this.prisma.playerNote.findMany({
      where: { tenantId: tenant.id, playerUserId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return notes.map(formatPlayerNote);
  }

  async createNote(userId: string, dto: CreatePlayerNoteDto, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    await this.assertPlayerOnTenant(userId, tenant.id);

    const note = await this.prisma.playerNote.create({
      data: {
        tenantId: tenant.id,
        playerUserId: userId,
        authorId: user.id,
        title: dto.title,
        content: dto.content,
        isPrivate: dto.isPrivate ?? true,
      },
    });
    return formatPlayerNote(note);
  }

  async removeNote(userId: string, noteId: string, user: AuthUserPayload) {
    const tenant = await resolveTenant(this.prisma, user);
    const note = await this.prisma.playerNote.findFirst({
      where: {
        id: noteId,
        tenantId: tenant.id,
        playerUserId: userId,
        deletedAt: null,
      },
    });
    if (!note) throw new NotFoundException('Note not found');

    await this.prisma.playerNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  private async assertPlayerOnTenant(userId: string, tenantId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { userId, deletedAt: null, court: { tenantId } },
      select: { id: true },
    });
    if (!booking) {
      throw new NotFoundException('Player not found for this tenant');
    }
  }

  private async listPlayerInvoices(userId: string, tenantId: string) {
    const [bookingIds, membershipIds] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId, deletedAt: null, court: { tenantId } },
        select: { id: true },
      }),
      this.prisma.membershipPurchase.findMany({
        where: { userId, deletedAt: null, plan: { court: { tenantId } } },
        select: { id: true },
      }),
    ]);

    const entityIds = [...bookingIds.map((b) => b.id), ...membershipIds.map((m) => m.id)];
    if (entityIds.length === 0) return [];

    const invoices = await this.prisma.paymentInvoice.findMany({
      where: {
        userId,
        OR: [
          {
            entityType: PaymentEntityType.BOOKING,
            entityId: { in: bookingIds.map((b) => b.id) },
          },
          {
            entityType: PaymentEntityType.MEMBERSHIP,
            entityId: { in: membershipIds.map((m) => m.id) },
          },
        ],
      },
      orderBy: { issuedAt: 'desc' },
    });

    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      entityType: invoice.entityType,
      entityId: invoice.entityId,
      subtotal: toNumber(invoice.subtotal),
      tax: toNumber(invoice.tax),
      total: toNumber(invoice.total),
      description: invoice.description,
      issuedAt: invoice.issuedAt,
    }));
  }

  private async listTrainingEnrollments(userId: string, tenantId: string) {
    const kids = await this.prisma.kidProfile.findMany({
      where: { parentId: userId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (kids.length === 0) return [];

    const enrollments = await this.prisma.trainingEnrollment.findMany({
      where: {
        kidId: { in: kids.map((kid) => kid.id) },
        deletedAt: null,
        batch: { program: { tenantId } },
      },
      include: {
        kid: { select: { id: true, firstName: true, lastName: true } },
        batch: {
          select: {
            id: true,
            name: true,
            schedule: true,
            program: { select: { id: true, name: true } },
            trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      paymentStatus: enrollment.paymentStatus,
      amountPaid: toNumber(enrollment.amountPaid),
      enrolledAt: enrollment.enrolledAt,
      kid: enrollment.kid,
      batch: enrollment.batch,
    }));
  }

  private async countAttendance(userId: string, tenantId: string) {
    const kids = await this.prisma.kidProfile.findMany({
      where: { parentId: userId, deletedAt: null },
      select: { id: true },
    });
    if (kids.length === 0) return 0;

    return this.prisma.attendanceRecord.count({
      where: {
        deletedAt: null,
        present: true,
        enrollment: {
          kidId: { in: kids.map((kid) => kid.id) },
          deletedAt: null,
          batch: { program: { tenantId } },
        },
      },
    });
  }
}
