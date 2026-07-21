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
  BookingSource,
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
import { SlotAvailabilityService } from '../availability/services/slot-availability.service';
import { SlotEventsService } from '../realtime/slot-events.service';
import { WaitlistService } from './waitlist.service';
import { type AuthUserPayload } from '../common/decorators/current-user.decorator';
import { buildCursorPaginatedResult, decodeCursor } from '../common/utils/cursor-pagination.util';
import { BOOKING_LOCK_TTL_MINUTES } from './constants/refund-rules';
import { SubscriptionService } from '../finance/subscription/subscription.service';
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
  type CreateWalkInBookingDto,
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
    @Inject(PrismaService)
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    @Inject(forwardRef(() => MembershipsService))
    private membershipsService: MembershipsService,
    @Inject(NotificationsService)
    private notificationsService: NotificationsService,
    @Inject(SlotAvailabilityService)
    private availability: SlotAvailabilityService,
    @Inject(SlotEventsService)
    private events: SlotEventsService,
    @Inject(WaitlistService)
    private waitlist: WaitlistService,
    @Inject(forwardRef(() => SubscriptionService))
    private subscriptions: SubscriptionService,
  ) {}

  /** Step 1–3: Select court slot → lock → create PENDING booking + payment order */
  async createBooking(dto: CreateBookingDto, userId: string) {
    const court = await this.prisma.court.findFirst({
      where: { id: dto.courtId, deletedAt: null },
      select: { tenantId: true },
    });
    if (!court) throw new NotFoundException('Court not found');
    await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);

    if (this.availability.isEngineEnabled()) {
      return this.createBookingV2(dto, userId);
    }
    return this.createBookingLegacy(dto, userId);
  }

  /**
   * Owner walk-in: reserve + confirm PAID immediately, record on-site payment + invoice.
   */
  async createWalkInBooking(dto: CreateWalkInBookingDto, owner: AuthUserPayload) {
    const court = await this.prisma.court.findFirst({
      where: { id: dto.courtId, deletedAt: null },
    });
    if (!court) throw new NotFoundException('Court not found');
    if (court.ownerId !== owner.id && !owner.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Only the court owner can create walk-in bookings');
    }
    if (court.tenantId) {
      await this.subscriptions.assertTenantCanAcceptBookings(court.tenantId);
    }

    const seats = dto.seats ?? 1;
    const equipmentFee = dto.equipmentFee ?? 0;
    const paymentMethod = dto.paymentMethod ?? 'UPI';
    const guestPhone = dto.guestPhone.trim();
    const guestName = dto.guestName.trim();

    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: dto.slotId, deletedAt: null },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.courtId !== dto.courtId) {
      throw new BadRequestException('Slot does not belong to the specified court');
    }

    const playerUserId = await this.resolveWalkInUserId(guestPhone, owner.id);
    const subtotal = Number(slot.price) + equipmentFee;
    const notesParts = [
      dto.notes?.trim(),
      equipmentFee > 0 ? `Equipment fee: ₹${equipmentFee}` : null,
      `Paid on-site via ${paymentMethod}`,
    ].filter(Boolean);
    const notes = notesParts.join(' · ') || undefined;

    let booking;
    const checkInCode = this.generateCheckInCode();

    if (this.availability.isEngineEnabled()) {
      const reserved = await this.availability.reserve({
        courtId: dto.courtId,
        slotId: dto.slotId,
        userId: playerUserId,
        seats,
        source: BookingSource.OWNER_WALK_IN,
        guestName,
        guestPhone,
        notes,
        subtotalAmount: subtotal,
        discountAmount: 0,
        totalAmount: subtotal,
      });
      booking = await this.availability.confirmReservation(reserved.booking.id, checkInCode);
    } else {
      booking = await this.prisma.$transaction(async (tx) => {
        const row = await tx.courtSlot.findFirst({
          where: { id: dto.slotId, deletedAt: null },
          include: {
            bookings: {
              where: { deletedAt: null, status: { not: BookingStatus.CANCELLED } },
              take: 1,
            },
          },
        });
        if (!row) throw new NotFoundException('Slot not found');
        if (row.isBlocked) throw new BadRequestException('Slot is blocked');
        if (row.bookings.length > 0) throw new BadRequestException('Slot is already booked');

        return tx.booking.create({
          data: {
            userId: playerUserId,
            courtId: dto.courtId,
            slotId: dto.slotId,
            seats,
            source: BookingSource.OWNER_WALK_IN,
            guestName,
            guestPhone,
            notes,
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
            subtotalAmount: subtotal,
            discountAmount: 0,
            totalAmount: subtotal,
            checkInCode,
          },
          include: BOOKING_INCLUDE,
        });
      });

      await this.events.emitSlotUpdated({
        id: slot.id,
        courtId: slot.courtId,
        capacity: slot.capacity ?? 1,
        reservedSeats: slot.reservedCount ?? 0,
        confirmedSeats: (slot.confirmedCount ?? 0) + seats,
        availableSeats: Math.max(
          0,
          (slot.capacity ?? 1) - (slot.reservedCount ?? 0) - (slot.confirmedCount ?? 0) - seats,
        ),
        availabilityStatus: 'FULL',
        isBooked: true,
        isBlocked: slot.isBlocked,
        blockReason: slot.blockReason,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: String(slot.price),
      });
      await this.events.emitBookingConfirmed({
        bookingId: booking.id,
        userId: playerUserId,
        checkInCode,
        slotId: slot.id,
        courtId: court.id,
      });
    }

    const paymentResult = await this.paymentsService.recordWalkInPayment({
      userId: playerUserId,
      bookingId: booking.id,
      amount: subtotal,
      paymentMethod,
      tenantId: court.tenantId,
    });

    await this.notificationsService.notifyBookingConfirmed(playerUserId, {
      id: booking.id,
      courtName: booking.court.name,
      slotStart: booking.slot.startTime,
      checkInCode: booking.checkInCode ?? checkInCode,
    });

    await this.logAudit(owner.id, AuditAction.CREATE, booking.id, null, booking);

    return {
      booking: this.formatBooking(booking),
      payment: paymentResult.payment,
      invoice: paymentResult.invoice,
      checkInCode: booking.checkInCode ?? checkInCode,
      message: 'Walk-in booking confirmed and paid on-site.',
    };
  }

  private async resolveWalkInUserId(guestPhone: string, ownerId: string) {
    const normalized = guestPhone.replace(/\s+/g, '');
    const digits = normalized.replace(/\D/g, '');
    const candidates = Array.from(
      new Set(
        [normalized, digits, digits.length >= 10 ? `+91${digits.slice(-10)}` : null].filter(
          Boolean,
        ) as string[],
      ),
    );

    const existing = await this.prisma.user.findFirst({
      where: { deletedAt: null, phone: { in: candidates } },
      select: { id: true },
    });

    return existing?.id ?? ownerId;
  }

  private async createBookingV2(dto: CreateBookingDto, userId: string) {
    await this.availability.releaseExpiredLocks();

    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: dto.slotId, deletedAt: null },
      include: { court: true },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.courtId !== dto.courtId) {
      throw new BadRequestException('Slot does not belong to the specified court');
    }

    const discountDetails = await this.membershipsService.getMembershipDiscountDetails(
      userId,
      slot.courtId,
    );
    const subtotal = Number(slot.price);
    const discountAmount = Math.round(subtotal * discountDetails.discount * 100) / 100;
    const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;

    const { booking, lockedUntil } = await this.availability.reserve({
      courtId: dto.courtId,
      slotId: dto.slotId,
      userId,
      couponId: dto.couponId,
      notes: dto.notes,
      source: BookingSource.PLAYER_APP,
      seats: 1,
      subtotalAmount: subtotal,
      discountAmount,
      totalAmount,
    });

    const payment = await this.paymentsService.createPaymentOrder(
      userId,
      Number(booking.totalAmount),
      PaymentEntityType.BOOKING,
      booking.id,
    );

    await this.waitlist.markConverted(dto.slotId, userId);

    const ttl = this.availability.getLockTtlMinutes();
    return {
      booking: this.formatBooking(booking),
      payment,
      lockExpiresAt: lockedUntil,
      membershipDiscount: discountDetails.discount,
      bookingsRemaining: discountDetails.bookingsRemaining,
      message: `Slot locked for ${ttl} minutes. Complete payment to confirm.`,
    };
  }

  private async createBookingLegacy(dto: CreateBookingDto, userId: string) {
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
        include: {
          bookings: {
            where: {
              deletedAt: null,
              status: { not: BookingStatus.CANCELLED },
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          court: { include: { sport: true } },
        },
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

      // Legacy capacity=1 semantics using bookings[]
      const active = slot.bookings[0];
      if (active) {
        await this.handleExistingBooking(tx, active, userId);
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

    await this.waitlist.markConverted(dto.slotId, userId);

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

    const isBookingOwner = booking.userId === user.id;
    const isCourtOwner = booking.court.ownerId === user.id;
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    if (!isBookingOwner && !isCourtOwner && !isAdmin) {
      throw new ForbiddenException(
        'You can only cancel your own bookings or bookings on your courts',
      );
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

    // V2 engine: abandon unpaid holds via availability service
    if (
      this.availability.isEngineEnabled() &&
      booking.status === BookingStatus.PENDING &&
      booking.paymentStatus === PaymentStatus.PENDING
    ) {
      await this.availability.releaseReservation(id, { reason: 'cancelled' });
      await this.events.emitBookingCancelled({
        bookingId: booking.id,
        userId: booking.userId,
        slotId: booking.slotId,
        courtId: booking.courtId,
        refundAmount: 0,
      });
      await this.notificationsService.notifyBookingCancelled(booking.userId, {
        id: booking.id,
        courtName: booking.court.name,
        refundAmount: 0,
      });
      await this.waitlist.offerNext(booking.slotId, booking.courtId, booking.seats ?? 1);
      return {
        booking: { ...this.formatBooking(booking), status: BookingStatus.CANCELLED },
        refundAmount: 0,
        refundPercent: calculateRefundPercent(hours),
        message: 'Booking cancelled. No refund applicable per policy.',
      };
    }

    if (this.availability.isEngineEnabled() && booking.paymentStatus === PaymentStatus.PAID) {
      await this.availability.releaseConfirmedSeats(booking.id);
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

    await this.events.emitBookingCancelled({
      bookingId: booking.id,
      userId: booking.userId,
      slotId: booking.slotId,
      courtId: booking.courtId,
      refundAmount,
    });

    await this.notificationsService.notifyBookingCancelled(booking.userId, {
      id: booking.id,
      courtName: booking.court.name,
      refundAmount,
    });

    if (this.availability.isEngineEnabled()) {
      await this.waitlist.offerNext(booking.slotId, booking.courtId, booking.seats ?? 1);
    }

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

    await this.events.emitAttendanceUpdated({
      bookingId: updated.id,
      userId: updated.userId,
      courtId: updated.courtId,
      slotId: updated.slotId,
      checkedInAt: updated.checkedInAt ?? new Date(),
    });

    return { booking: this.formatBooking(updated), message: 'Check-in successful' };
  }

  /** Called by PaymentsService after successful payment */
  async confirmAfterPayment(bookingId: string) {
    const checkInCode = this.generateCheckInCode();

    if (this.availability.isEngineEnabled()) {
      const booking = await this.availability.confirmReservation(bookingId, checkInCode);
      await this.notificationsService.notifyBookingConfirmed(booking.userId, {
        id: booking.id,
        courtName: booking.court.name,
        slotStart: booking.slot.startTime,
        checkInCode,
      });
      return booking;
    }

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

    this.events.emitBookingConfirmed({
      bookingId: booking.id,
      userId: booking.userId,
      courtId: booking.courtId,
      slotId: booking.slotId,
      checkInCode,
    });

    return booking;
  }

  async releaseExpiredLocks() {
    if (this.availability.isEngineEnabled()) {
      return this.availability.releaseExpiredLocks();
    }

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
