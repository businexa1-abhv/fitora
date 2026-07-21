import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  PaymentEntityType,
  PaymentStatus,
  ServiceCategory,
  ServiceOrderStatus,
  UserRole,
} from '@prisma/client';
import { ServicesService } from './services.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { mockNotificationsService, mockPaymentsService } from '../../test/helpers/mock-deps';

const listing = {
  id: 'listing-1',
  providerId: 'provider-1',
  category: ServiceCategory.STRINGING,
  title: 'Pro Stringing',
  description: 'Fast',
  price: 500,
  city: 'Bangalore',
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  turnaroundDays: 2,
  sportId: null,
  sport: null,
  provider: { id: 'provider-1', firstName: 'P', lastName: 'R', email: 'p@f.com' },
  _count: { orders: 0, reviews: 0 },
};

describe('ServicesService (extended)', () => {
  let service: ServicesService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let notifications: ReturnType<typeof mockNotificationsService>;

  beforeEach(async () => {
    notifications = mockNotificationsService();
    prisma = {
      serviceListing: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      serviceOrder: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      sport: { findUnique: jest.fn() },
      serviceReview: { findMany: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: mockPaymentsService() },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(ServicesService);
  });

  it('findListingById returns listing', async () => {
    prisma.serviceListing.findFirst.mockResolvedValue(listing as never);
    const result = await service.findListingById('listing-1');
    expect(result.title).toBe('Pro Stringing');
  });

  it('findListingById throws when not found', async () => {
    prisma.serviceListing.findFirst.mockResolvedValue(null);
    await expect(service.findListingById('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bookService creates order and payment', async () => {
    prisma.serviceListing.findFirst.mockResolvedValue(listing as never);
    prisma.serviceOrder.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'SRV-1',
      userId: 'u1',
      listingId: 'listing-1',
      providerId: 'provider-1',
      subtotalAmount: 500,
      discountAmount: 0,
      totalAmount: 500,
      paymentStatus: PaymentStatus.PENDING,
      status: ServiceOrderStatus.PENDING,
      customerNotes: null,
      listing,
      user: { id: 'u1', firstName: 'A', lastName: 'B', email: 'a@f.com' },
      provider: listing.provider,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await service.bookService('u1', 'listing-1', {
      pickupAddress: '123 St',
      pickupPhone: '9999999999',
      pickupCity: 'Bangalore',
    });

    expect(result.order.id).toBe('order-1');
    expect(result.payment.paymentId).toBe('pay-1');
  });

  it('confirmAfterPayment activates order and notifies', async () => {
    prisma.serviceOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'SRV-1',
      userId: 'u1',
      providerId: 'provider-1',
      paymentStatus: PaymentStatus.PENDING,
      status: ServiceOrderStatus.PENDING,
      listing: { title: 'Stringing' },
    } as never);
    prisma.serviceOrder.update.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'SRV-1',
      userId: 'u1',
      providerId: 'provider-1',
      paymentStatus: PaymentStatus.PAID,
      status: ServiceOrderStatus.ACCEPTED,
      listing,
      user: { id: 'u1', firstName: 'A', lastName: 'B', email: 'a@f.com' },
      provider: listing.provider,
      subtotalAmount: 500,
      discountAmount: 0,
      totalAmount: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await service.confirmAfterPayment('order-1');
    expect(notifications.notifyServiceOrderUpdate).toHaveBeenCalledTimes(2);
  });

  it('getProviderDashboard aggregates stats', async () => {
    (prisma.serviceListing as { count: jest.Mock }).count = jest.fn().mockResolvedValue(3);
    (prisma.serviceOrder as { count: jest.Mock }).count = jest
      .fn()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    prisma.serviceOrder.findMany.mockResolvedValue([]);

    const dashboard = await service.getProviderDashboard('provider-1');
    expect(dashboard.listingCount).toBe(3);
  });

  it('getMyOrders returns user orders', async () => {
    prisma.serviceOrder.findMany.mockResolvedValue([]);
    const orders = await service.getMyOrders('u1');
    expect(orders).toEqual([]);
  });

  it('updateListing updates provider listing', async () => {
    prisma.serviceListing.findFirst.mockResolvedValue(listing as never);
    prisma.serviceListing.update.mockResolvedValue({ ...listing, title: 'Updated' } as never);

    const updated = await service.updateListing(
      'listing-1',
      {
        id: 'provider-1',
        email: 'p@f.com',
        roles: [UserRole.SERVICE_PROVIDER],
      },
      { title: 'Updated' },
    );
    expect(updated.title).toBe('Updated');
  });

  it('getOrder allows provider access', async () => {
    prisma.serviceOrder.findFirst.mockResolvedValue({
      id: 'order-1',
      userId: 'u1',
      providerId: 'provider-1',
      listing,
      provider: listing.provider,
      user: { id: 'u1', firstName: 'A', lastName: 'B', email: 'a@f.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const order = await service.getOrder('order-1', {
      id: 'provider-1',
      email: 'p@f.com',
      roles: [UserRole.SERVICE_PROVIDER],
    });
    expect(order.id).toBe('order-1');
  });

  it('adminListListings returns paginated listings', async () => {
    prisma.serviceListing.findMany.mockResolvedValue([listing] as never);
    prisma.serviceListing.count.mockResolvedValue(1);

    const result = await service.adminListListings({ page: 1 });
    expect(result.total).toBe(1);
  });
});
