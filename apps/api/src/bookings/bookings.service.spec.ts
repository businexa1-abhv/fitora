import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  BookingStatus,
  CourtApprovalStatus,
  PaymentEntityType,
  PaymentStatus,
  UserRole,
} from '@prisma/client';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.module';
import { PaymentsService } from '../payments/payments.service';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SlotAvailabilityService } from '../availability/services/slot-availability.service';
import { SlotEventsService } from '../realtime/slot-events.service';
import { WaitlistService } from './waitlist.service';
import { SubscriptionService } from '../finance/subscription/subscription.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: any;
  let paymentsService: any;
  let membershipsService: any;
  let notificationsService: any;

  const userId = 'player-1';
  const futureStart = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const mockSlot = {
    id: 'slot-1',
    courtId: 'court-1',
    price: '500',
    isBlocked: false,
    startTime: futureStart,
    endTime: new Date(futureStart.getTime() + 60 * 60 * 1000),
    booking: null,
    bookings: [],
    court: {
      id: 'court-1',
      deletedAt: null,
      approvalStatus: CourtApprovalStatus.APPROVED,
      isActive: true,
      sport: { id: 'sport-1', name: 'Badminton', slug: 'badminton' },
    },
  };

  const mockBooking = {
    id: 'booking-1',
    userId,
    courtId: 'court-1',
    slotId: 'slot-1',
    status: BookingStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    subtotalAmount: '500',
    discountAmount: '0',
    totalAmount: '500',
    lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
    checkInCode: null,
    cancelledAt: null,
    cancelReason: null,
    checkedInAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    court: {
      id: 'court-1',
      name: 'Test Arena',
      city: 'Bangalore',
      address: 'MG Road',
      ownerId: 'owner-1',
      sport: { id: 'sport-1', name: 'Badminton', slug: 'badminton' },
    },
    slot: {
      id: 'slot-1',
      startTime: futureStart,
      endTime: new Date(futureStart.getTime() + 60 * 60 * 1000),
      price: '500',
    },
  };

  beforeEach(async () => {
    prisma = {
      courtSlot: { findFirst: jest.fn() },
      booking: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      court: { findFirst: jest.fn(), findUnique: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    } as any;

    paymentsService = {
      createPaymentOrder: jest.fn().mockResolvedValue({
        paymentId: 'pay-1',
        orderId: 'mock_order_pay-1',
        mockMode: true,
      }),
      refundBookingPayment: jest.fn().mockResolvedValue({}),
    };

    membershipsService = {
      getActiveMembershipDiscount: jest.fn().mockResolvedValue(0),
      getMembershipDiscountDetails: jest.fn().mockResolvedValue({
        discount: 0,
        purchaseId: null,
        bookingsRemaining: null,
      }),
    };

    notificationsService = {
      notifyBookingConfirmed: jest.fn(),
      notifyBookingCancelled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: MembershipsService, useValue: membershipsService },
        { provide: NotificationsService, useValue: notificationsService },
        {
          provide: SlotAvailabilityService,
          useValue: {
            isEngineEnabled: jest.fn().mockReturnValue(false),
            getLockTtlMinutes: jest.fn().mockReturnValue(15),
            releaseExpiredLocks: jest.fn().mockResolvedValue({ released: 0 }),
            reserve: jest.fn(),
            confirmReservation: jest.fn(),
            releaseReservation: jest.fn(),
            releaseConfirmedSeats: jest.fn(),
            getSlotAvailability: jest.fn(),
          },
        },
        {
          provide: SlotEventsService,
          useValue: {
            emitSlotUpdated: jest.fn(),
            emitBookingConfirmed: jest.fn(),
            emitBookingCancelled: jest.fn(),
            emitAttendanceUpdated: jest.fn(),
          },
        },
        {
          provide: WaitlistService,
          useValue: { addToWaitlist: jest.fn(), notifyNextInWaitlist: jest.fn() },
        },
        {
          provide: SubscriptionService,
          useValue: { assertTenantCanAcceptBookings: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(BookingsService);
  });

  describe('createBooking', () => {
    it('locks slot and creates pending booking with payment order', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          courtSlot: { findFirst: jest.fn().mockResolvedValue(mockSlot) },
          booking: { create: jest.fn().mockResolvedValue(mockBooking), delete: jest.fn() },
        } as never),
      );

      const result = await service.createBooking({ courtId: 'court-1', slotId: 'slot-1' }, userId);

      expect(result.booking.id).toBe('booking-1');
      expect(result.lockExpiresAt).toBeInstanceOf(Date);
      expect(paymentsService.createPaymentOrder).toHaveBeenCalledWith(
        userId,
        500,
        PaymentEntityType.BOOKING,
        'booking-1',
      );
    });

    it('prevents double booking when slot is paid', async () => {
      const slotWithBooking = {
        ...mockSlot,
        bookings: [
          {
            id: 'existing',
            userId: 'other',
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
            lockedUntil: null,
          },
        ],
      };

      prisma.booking.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          courtSlot: { findFirst: jest.fn().mockResolvedValue(slotWithBooking) },
          booking: { delete: jest.fn(), create: jest.fn() },
        } as never),
      );

      await expect(
        service.createBooking({ courtId: 'court-1', slotId: 'slot-1' }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when slot is locked by another player', async () => {
      const slotWithLock = {
        ...mockSlot,
        bookings: [
          {
            id: 'existing',
            userId: 'other',
            status: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
          },
        ],
      };

      prisma.booking.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          courtSlot: { findFirst: jest.fn().mockResolvedValue(slotWithLock) },
          booking: { delete: jest.fn(), create: jest.fn() },
        } as never),
      );

      await expect(
        service.createBooking({ courtId: 'court-1', slotId: 'slot-1' }, userId),
      ).rejects.toThrow('temporarily locked');
    });
  });

  describe('cancelBooking', () => {
    it('applies full refund when >24h before slot', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      } as never);
      prisma.booking.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.REFUNDED,
      } as never);

      const result = await service.cancelBooking(
        'booking-1',
        { reason: 'Changed plans' },
        { id: userId, email: 'p@f.com', roles: [UserRole.PLAYER] },
      );

      expect(result.refundAmount).toBe(500);
      expect(paymentsService.refundBookingPayment).toHaveBeenCalledWith('booking-1', 500);
      expect(notificationsService.notifyBookingCancelled).toHaveBeenCalled();
    });

    it('forbids cancelling another users booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking as never);

      await expect(
        service.cancelBooking(
          'booking-1',
          {},
          { id: 'other', email: 'x@f.com', roles: [UserRole.PLAYER] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmAfterPayment', () => {
    it('confirms booking and sends notification', async () => {
      prisma.booking.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        checkInCode: 'ABC123',
      } as never);

      await service.confirmAfterPayment('booking-1');

      expect(notificationsService.notifyBookingConfirmed).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ id: 'booking-1', courtName: 'Test Arena' }),
      );
    });
  });

  describe('releaseExpiredLocks', () => {
    it('deletes expired pending bookings', async () => {
      prisma.booking.findMany.mockResolvedValue([{ id: 'expired-1' }] as never);
      prisma.booking.delete.mockResolvedValue({} as never);

      const result = await service.releaseExpiredLocks();

      expect(result.released).toBe(1);
      expect(prisma.booking.delete).toHaveBeenCalledWith({ where: { id: 'expired-1' } });
    });
  });

  describe('getHistory', () => {
    it('returns paginated booking history', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking] as never);
      prisma.booking.count.mockResolvedValue(1);

      const result = await service.getHistory(userId, { page: 1 });

      expect(result.items).toHaveLength(1);
      expect((result as any).total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns booking for owner', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking as never);

      const result = await service.findOne('booking-1', {
        id: userId,
        email: 'p@f.com',
        roles: [UserRole.PLAYER],
      });

      expect(result.id).toBe('booking-1');
    });

    it('throws when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('missing', { id: userId, email: 'p@f.com', roles: [UserRole.PLAYER] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRefundPreview', () => {
    it('calculates full refund when >24h before slot', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      } as never);

      const preview = await service.getRefundPreview('booking-1', {
        id: userId,
        email: 'p@f.com',
        roles: [UserRole.PLAYER],
      });

      expect(preview.refundAmount).toBe(500);
      expect(preview.refundPercent).toBe(100);
    });
  });

  describe('getQrCode', () => {
    it('generates QR for confirmed booking', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        checkInCode: 'ABC123',
        court: { id: 'court-1', name: 'Arena', ownerId: 'owner-1' },
        slot: { startTime: new Date(Date.now() + 48 * 60 * 60 * 1000) },
      } as never);

      const result = await service.getQrCode('booking-1', {
        id: userId,
        email: 'p@f.com',
        roles: [UserRole.PLAYER],
      });

      expect(result.checkInCode).toBe('ABC123');
      expect(result.qrCodeDataUrl).toContain('data:image/png');
    });
  });

  describe('checkIn', () => {
    it('checks in player with valid code', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        checkInCode: 'ABC123',
        checkedInAt: null,
        court: { id: 'court-1', name: 'Arena', ownerId: 'owner-1' },
        slot: { startTime: new Date(), price: '500' },
      } as never);
      prisma.court.findUnique.mockResolvedValue({ id: 'court-1', ownerId: 'owner-1' } as never);
      prisma.booking.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.COMPLETED,
        checkedInAt: new Date(),
        court: { id: 'court-1', name: 'Arena', ownerId: 'owner-1' },
        slot: { startTime: new Date(), price: '500' },
      } as never);

      const result = await service.checkIn(
        'booking-1',
        { checkInCode: 'abc123' },
        { id: 'owner-1', email: 'o@f.com', roles: [UserRole.COURT_OWNER] },
      );

      expect(result.message).toContain('successful');
    });
  });
});
