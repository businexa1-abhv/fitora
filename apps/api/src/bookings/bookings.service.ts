import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  AuditAction,
  BookingStatus,
  CourtApprovalStatus,
  PaymentEntityType,
  PaymentStatus,
  type Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { PaymentsService } from '../payments/payments.service';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';
import { type AuthUserPayload } from '../common/decorators/current-user.decorator';
import { buildCursorPaginatedResult, decodeCursor } from '../common/utils/cursor-pagination.util';
import { BOOKING_LOCK_TTL_MINUTES } from './constants/refund-rules';
import {
  calculateRefundAmount,
  calculateRefundPercent,
  hoursUntilSlot,
  REFUND_RULES,
} from './constants/refund-rules';
import {
  type BookingHistoryQueryDto,
  type CancelBookingDto,
  type CheckInDto,
  type CreateBookingDto,
} from './dto';
import { buildQrPayload, generateQrDataUrl } from './utils/qr-code.util';

const BOOKING_INCLUDE = {
  court: {
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      ownerId: true,
      sport: { select: { id: true, name: true, slug: true } },
    },
  },
  slot: { select: { id: true, startTime: true, endTime: true, price: true } },
} as const;

@Injectable()
export class BookingsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    @Inject(forwardRef(() => MembershipsService))
    private membershipsService: MembershipsService,
    @Inject(NotificationsService) private notificationsService: NotificationsService,
  ) {}

  /** Step 1–3: Select court slot → lock → create PENDING booking + payment order */
  async createBooking(dto: CreateBookingDto, userId: string) {
    await this.releaseExpiredLocks();

    const lockedUntil = new Date(Date.now() + BOOKING_LOCK_TTL_MINUTES * 60_000);

    let discountDetails = {
      discount: 0,
      purchaseId: null as string | null,
      bookingsRemaining: null as number | null,
    };

    const booking = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.courtSlot.findFirst({
        where: { id: dto.slotId, deletedAt: null },
        include: { booking: true, court: { include: { sport: true } } },
      });

      if (!slot) throw new NotFoundException('Slot not found');
      if (slot.courtId !== dto.courtId) {
        throw new BadRequestException('Slot does not belong to the specified court');
      }

      this.validateSlotAvailable(slot);

      discountDetails = await this.membershipsService.getMembershipDiscountDetails(
        userId,
        slot.courtId,
      );
      const discount = discountDetails.discount;

      if (slot.booking) {
        await this.handleExistingBooking(tx, slot.booking, userId);
      }

      const subtotal = Number(slot.price);
      const discountAmount = Math.round(subtotal * discount * 100) / 100;
      const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;

      return tx.booking.create({
        data: {
          userId,
          courtId: slot.courtId,
          slotId: slot.id,
          couponId: dto.couponId,
          notes: dto.notes,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          subtotalAmount: subtotal,
          discountAmount,
          totalAmount,
          lockedUntil,
        },
        include: BOOKING_INCLUDE,
      });
    });

    const payment = await this.paymentsService.createPaymentOrder(
      userId,
      Number(booking.totalAmount),
      PaymentEntityType.BOOKING,
      booking.id,
    );

    return {
      booking: this.formatBooking(booking),
      payment,
      lockExpiresAt: lockedUntil,
      membershipDiscount: discountDetails.discount,
      bookingsRemaining: discountDetails.bookingsRemaining,
      message: `Slot locked for ${BOOKING_LOCK_TTL_MINUTES} minutes. Complete payment to confirm.`,
    };
  }

  async findOne(id: string, user: AuthUserPayload) {
    const booking = await this.getBookingOrThrow(id);
    this.assertCanView(booking, user);
    return this.formatBooking(booking);
  }

  async getHistory(userId: string, query: BookingHistoryQueryDto) {
    if (query.cursor || query.limit) {
      return this.getHistoryCursor(userId, query);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BookingWhereInput = {
      userId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: items.map((b) => this.formatBooking(b)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getHistoryCursor(userId: string, query: BookingHistoryQueryDto) {
    const limit = query.limit ?? query.pageSize ?? 20;
    const where: Prisma.BookingWhereInput = {
      userId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
    };

    const decoded = query.cursor ? decodeCursor(query.cursor) : null;
    if (decoded) {
      where.OR = [
        { createdAt: { lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, id: { lt: decoded.id } },
      ];
    }

    const items = await this.prisma.booking.findMany({
      where,
      include: BOOKING_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    return buildCursorPaginatedResult(
      items.map((b) => ({ ...this.formatBooking(b), createdAt: b.createdAt })),
      limit,
    );
  }

  async adminListBookings(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: BookingStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    ownerId?: string;
    courtId?: string;
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const sortBy = params?.sortBy ?? 'createdAt';
    const sortOrder = params?.sortOrder ?? 'desc';

    const allowedSort = ['createdAt', 'totalAmount', 'status'] as const;
    const orderField = allowedSort.includes(sortBy as (typeof allowedSort)[number])
      ? sortBy
      : 'createdAt';

    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
      ...(params?.status && { status: params.status }),
      ...(params?.courtId && { courtId: params.courtId }),
      ...(params?.ownerId && { court: { ownerId: params.ownerId } }),
      ...(params?.search && {
        OR: [
          { user: { firstName: { contains: params.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: params.search, mode: 'insensitive' } } },
          { user: { email: { contains: params.search, mode: 'insensitive' } } },
          { court: { name: { contains: params.search, mode: 'insensitive' } } },
          { court: { city: { contains: params.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          ...BOOKING_INCLUDE,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: items.map((b) => this.formatBooking(b)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getCourtBookings(courtId: string, user: AuthUserPayload) {
    const court = await this.prisma.court.findFirst({
      where: { id: courtId, deletedAt: null },
    });
    if (!court) throw new NotFoundException('Court not found');
    this.assertOwnerOrAdmin(court.ownerId, user);

    const items = await this.prisma.booking.findMany({
      where: { courtId, deletedAt: null },
      include: {
        ...BOOKING_INCLUDE,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((b) => this.formatBooking(b));
  }

  async getRefundPreview(id: string, user: AuthUserPayload) {
    const booking = await this.getBookingOrThrow(id);
    this.assertCanView(booking, user);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    const hours = hoursUntilSlot(booking.slot.startTime);
    const totalPaid = Number(booking.totalAmount);
    const refundPercent = calculateRefundPercent(hours);
    const refundAmount = calculateRefundAmount(
      booking.paymentStatus === PaymentStatus.PAID ? totalPaid : 0,
      hours,
    );

    return {
      refundPercent,
      refundAmount,
      hoursUntilSlot: Math.round(hours * 10) / 10,
      policyLabel:
        REFUND_RULES.find((r) => r.refundPercent === refundPercent)?.label ?? 'No refund',
      rules: REFUND_RULES,
    };
  }

  async cancelBooking(id: string, dto: CancelBookingDto, user: AuthUserPayload) {
    const booking = await this.getBookingOrThrow(id);

    if (booking.userId !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Completed bookings cannot be cancelled');
    }

    const hours = hoursUntilSlot(booking.slot.startTime);
    let refundAmount = 0;

    if (booking.paymentStatus === PaymentStatus.PAID) {
      refundAmount = calculateRefundAmount(Number(booking.totalAmount), hours);
      if (refundAmount > 0) {
        await this.paymentsService.refundBookingPayment(booking.id, refundAmount);
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        paymentStatus:
          refundAmount > 0
            ? refundAmount >= Number(booking.totalAmount)
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PARTIALLY_REFUNDED
            : booking.paymentStatus,
        cancelledAt: new Date(),
        cancelReason: dto.reason,
        lockedUntil: null,
      },
      include: BOOKING_INCLUDE,
    });

    await this.notificationsService.notifyBookingCancelled(booking.userId, {
      id: booking.id,
      courtName: booking.court.name,
      refundAmount,
    });

    await this.logAudit(user.id, AuditAction.STATUS_CHANGE, id, booking, updated);

    return {
      booking: this.formatBooking(updated),
      refundAmount,
      refundPercent: calculateRefundPercent(hours),
      message:
        refundAmount > 0
          ? `Booking cancelled. Refund of ₹${refundAmount} initiated.`
          : 'Booking cancelled. No refund applicable per policy.',
    };
  }

  async getQrCode(id: string, user: AuthUserPayload) {
    const booking = await this.getBookingOrThrow(id);
    this.assertCanView(booking, user);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('QR code available only for confirmed bookings');
    }
    if (!booking.checkInCode) {
      throw new BadRequestException('Check-in code not generated yet');
    }

    const payload = buildQrPayload({
      bookingId: booking.id,
      checkInCode: booking.checkInCode,
      courtId: booking.courtId,
      courtName: booking.court.name,
      slotStart: booking.slot.startTime.toISOString(),
    });

    const qrCodeDataUrl = await generateQrDataUrl(payload);

    return {
      bookingId: booking.id,
      checkInCode: booking.checkInCode,
      payload,
      qrCodeDataUrl,
    };
  }

  async checkIn(id: string, dto: CheckInDto, user: AuthUserPayload) {
    const booking = await this.getBookingOrThrow(id);

    const court = await this.prisma.court.findUnique({ where: { id: booking.courtId } });
    if (!court) throw new NotFoundException('Court not found');

    const isOwner = user.id === court.ownerId;
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only court owner or admin can check in players');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be checked in');
    }

    if (booking.checkInCode !== dto.checkInCode.toUpperCase()) {
      throw new BadRequestException('Invalid check-in code');
    }

    if (booking.checkedInAt) {
      throw new BadRequestException('Already checked in');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { checkedInAt: new Date(), status: BookingStatus.COMPLETED },
      include: BOOKING_INCLUDE,
    });

    return { booking: this.formatBooking(updated), message: 'Check-in successful' };
  }

  /** Called by PaymentsService after successful payment */
  async confirmAfterPayment(bookingId: string) {
    const checkInCode = this.generateCheckInCode();

    const booking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        checkInCode,
        lockedUntil: null,
      },
      include: BOOKING_INCLUDE,
    });

    await this.notificationsService.notifyBookingConfirmed(booking.userId, {
      id: booking.id,
      courtName: booking.court.name,
      slotStart: booking.slot.startTime,
      checkInCode,
    });

    return booking;
  }

  async releaseExpiredLocks() {
    const now = new Date();
    const expired = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        deletedAt: null,
        OR: [
          { lockedUntil: { lt: now } },
          {
            lockedUntil: null,
            createdAt: { lt: new Date(now.getTime() - BOOKING_LOCK_TTL_MINUTES * 60_000) },
          },
        ],
      },
    });

    for (const booking of expired) {
      await this.prisma.booking.delete({ where: { id: booking.id } }).catch(() => undefined);
    }

    return { released: expired.length };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private validateSlotAvailable(slot: {
    isBlocked: boolean;
    startTime: Date;
    court: { deletedAt: Date | null; approvalStatus: CourtApprovalStatus; isActive: boolean };
  }) {
    if (slot.court.deletedAt || slot.court.approvalStatus !== CourtApprovalStatus.APPROVED) {
      throw new BadRequestException('Court is not available for booking');
    }
    if (!slot.court.isActive) throw new BadRequestException('Court is not active');
    if (slot.isBlocked) throw new BadRequestException('Slot is blocked');
    if (slot.startTime <= new Date()) throw new BadRequestException('Cannot book a past slot');
  }

  private async handleExistingBooking(
    tx: Prisma.TransactionClient,
    existing: {
      id: string;
      userId: string;
      status: BookingStatus;
      paymentStatus: PaymentStatus;
      lockedUntil: Date | null;
    },
    userId: string,
  ) {
    if (
      existing.status !== BookingStatus.CANCELLED &&
      existing.paymentStatus === PaymentStatus.PAID
    ) {
      throw new BadRequestException('Slot is already booked');
    }

    if (existing.status === BookingStatus.PENDING) {
      const stillLocked =
        existing.lockedUntil && existing.lockedUntil > new Date() && existing.userId !== userId;

      if (stillLocked) {
        throw new BadRequestException(
          'Slot is temporarily locked by another player. Try again shortly.',
        );
      }

      await tx.booking.delete({ where: { id: existing.id } });
    }
  }

  private async getBookingOrThrow(id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: BOOKING_INCLUDE,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private assertCanView(
    booking: { userId: string; court: { ownerId: string } },
    user: AuthUserPayload,
  ) {
    if (
      booking.userId !== user.id &&
      !user.roles.includes(UserRole.ADMIN) &&
      booking.court.ownerId !== user.id
    ) {
      throw new ForbiddenException('Access denied');
    }
  }

  private assertOwnerOrAdmin(ownerId: string, user: AuthUserPayload) {
    if (user.roles.includes(UserRole.ADMIN) || user.id === ownerId) return;
    throw new ForbiddenException('Insufficient permissions');
  }

  private generateCheckInCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private formatBooking(
    booking: Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }> & {
      user?: { id: string; firstName: string; lastName: string; email: string };
    },
  ) {
    return {
      ...booking,
      subtotalAmount: booking.subtotalAmount.toString(),
      discountAmount: booking.discountAmount.toString(),
      totalAmount: booking.totalAmount.toString(),
      slot: {
        ...booking.slot,
        price: booking.slot.price.toString(),
      },
      sportType: booking.court.sport?.slug?.toUpperCase().replace(/-/g, '_') ?? null,
    };
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
        entityType: 'booking',
        entityId,
        before: before ? (before as Prisma.InputJsonValue) : undefined,
        after: after ? (after as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}
