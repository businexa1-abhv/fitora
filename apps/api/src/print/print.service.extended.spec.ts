import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentEntityType,
  PaymentStatus,
  PrintOrderStatus,
  UserRole,
} from '@prisma/client';
import { PrintService } from './print.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { mockNotificationsService, mockPaymentsService } from '../../test/helpers/mock-deps';
import { asUser } from '../../test/helpers/auth.fixtures';

const listing = {
  id: 'listing-1',
  providerId: 'provider-1',
  title: 'Custom Tee',
  price: 399,
  minQuantity: 1,
  isActive: true,
  deletedAt: null,
  city: 'BLR',
};

describe('PrintService (extended)', () => {
  let service: PrintService;
  let prisma: jest.Mocked<
    Pick<
      PrismaService,
      'printDesign' | 'printListing' | 'printOrder' | 'user'
    >
  >;
  let notifications: ReturnType<typeof mockNotificationsService>;

  beforeEach(async () => {
    notifications = mockNotificationsService();
    prisma = {
      printDesign: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      printListing: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      printOrder: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: { findFirst: jest.fn() },
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: mockPaymentsService() },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(PrintService);
  });

  it('uploadDesign stores image design', async () => {
    prisma.printDesign.create.mockResolvedValue({
      id: 'd1',
      fileName: 'logo.png',
      mimeType: 'image/png',
      url: 'data:image/png;base64,abc',
      createdAt: new Date(),
    } as never);

    const result = await service.uploadDesign('u1', {
      fileName: 'logo.png',
      mimeType: 'image/png',
      dataBase64: 'abc',
    });
    expect(result.id).toBe('d1');
  });

  it('findListings returns paginated listings', async () => {
    prisma.printListing.findMany.mockResolvedValue([]);
    prisma.printListing.count.mockResolvedValue(0);

    const result = await service.findListings({ page: 1 });
    expect(result.total).toBe(0);
  });

  it('createOrder creates print order and payment', async () => {
    prisma.printListing.findFirst.mockResolvedValue(listing as never);
    prisma.printOrder.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PRT-1',
      userId: 'u1',
      providerId: 'provider-1',
      subtotalAmount: 399,
      totalAmount: 399,
      paymentStatus: PaymentStatus.PENDING,
      status: PrintOrderStatus.PENDING,
      quantity: 1,
      tshirtSize: 'M',
      tshirtColor: 'Black',
      listing: { id: 'listing-1', title: 'Custom Tee' },
      provider: { id: 'provider-1', firstName: 'P', lastName: 'R', email: 'p@f.com' },
      user: { id: 'u1', firstName: 'U', lastName: '1', email: 'u@f.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await service.createOrder('u1', 'listing-1', {
      designUrl: 'https://cdn.example/d.png',
      tshirtSize: 'M',
      tshirtColor: 'Black',
      quantity: 1,
    });

    expect(result.order.id).toBe('order-1');
    expect(result.payment.paymentId).toBe('pay-1');
  });

  it('createOrder rejects invalid size', async () => {
    prisma.printListing.findFirst.mockResolvedValue(listing as never);
    await expect(
      service.createOrder('u1', 'listing-1', {
        designUrl: 'https://cdn.example/d.png',
        tshirtSize: 'XXS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirmAfterPayment marks order paid and notifies', async () => {
    prisma.printOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PRT-1',
      userId: 'u1',
      providerId: 'provider-1',
      paymentStatus: PaymentStatus.PENDING,
      status: PrintOrderStatus.PENDING,
      quantity: 1,
      tshirtSize: 'M',
      tshirtColor: 'Black',
      listing: listing,
      provider: { id: 'provider-1', firstName: 'P', lastName: 'R', email: 'p@f.com' },
      user: { id: 'u1', firstName: 'U', lastName: '1', email: 'u@f.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    prisma.printOrder.update.mockResolvedValue({
      id: 'order-1',
      paymentStatus: PaymentStatus.PAID,
      status: PrintOrderStatus.ACCEPTED,
      orderNumber: 'PRT-1',
      listing,
      provider: { id: 'provider-1', firstName: 'P', lastName: 'R', email: 'p@f.com' },
      user: { id: 'u1', firstName: 'U', lastName: '1', email: 'u@f.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await service.confirmAfterPayment('order-1');
    expect(result.paymentStatus).toBe(PaymentStatus.PAID);
    expect(notifications.notifyPrintOrderUpdate).toHaveBeenCalledTimes(2);
  });

  it('getOrder allows customer access', async () => {
    prisma.printOrder.findFirst.mockResolvedValue({
      id: 'order-1',
      userId: 'player-1',
      providerId: 'provider-1',
      orderNumber: 'PRT-1',
      listing,
      provider: { id: 'provider-1', firstName: 'P', lastName: 'R', email: 'p@f.com' },
      user: { id: 'player-1', firstName: 'U', lastName: '1', email: 'u@f.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const order = await service.getOrder('order-1', asUser('player'));
    expect(order.id).toBe('order-1');
  });

  it('getOrder forbids unrelated user', async () => {
    prisma.printOrder.findFirst.mockResolvedValue({
      id: 'order-1',
      userId: 'other',
      providerId: 'provider-1',
      orderNumber: 'PRT-1',
      listing,
      provider: { id: 'provider-1', firstName: 'P', lastName: 'R', email: 'p@f.com' },
      user: { id: 'other', firstName: 'O', lastName: '1', email: 'o@f.com' },
    } as never);

    await expect(service.getOrder('order-1', asUser('player'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('getMyOrders returns paid orders', async () => {
    prisma.printOrder.findMany.mockResolvedValue([]);
    const orders = await service.getMyOrders('u1');
    expect(orders).toEqual([]);
  });

  it('findListingById throws when missing', async () => {
    prisma.printListing.findFirst.mockResolvedValue(null);
    await expect(service.findListingById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createListing creates listing for printer', async () => {
    prisma.printListing.create.mockResolvedValue({
      id: 'listing-1',
      providerId: 'provider-1',
      title: 'Custom Tee',
      description: 'Print service',
      price: 399,
      minQuantity: 1,
      city: 'BLR',
      turnaroundDays: 5,
      isActive: true,
      provider: { id: 'provider-1', firstName: 'P', lastName: 'R' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await service.createListing(
      { id: 'provider-1', email: 'p@f.com', roles: [UserRole.PRINTER] },
      { title: 'Custom Tee', description: 'Print service', price: 399, city: 'BLR' },
    );
    expect(result.title).toBe('Custom Tee');
  });

  it('getDesign returns design for owner', async () => {
    prisma.printDesign.findUnique.mockResolvedValue({
      id: 'd1',
      userId: 'u1',
      fileName: 'logo.png',
      mimeType: 'image/png',
      url: 'data:image/png;base64,x',
      createdAt: new Date(),
    } as never);

    const design = await service.getDesign('d1', { id: 'u1', email: 'u@f.com', roles: [UserRole.PLAYER] });
    expect(design.id).toBe('d1');
  });

  it('updateOrderStatus updates as provider', async () => {
    prisma.printOrder.findFirst.mockResolvedValue({
      id: 'order-1',
      userId: 'u1',
      providerId: 'provider-1',
      status: PrintOrderStatus.ACCEPTED,
      orderNumber: 'PRT-1',
      listing,
      provider: { id: 'provider-1', firstName: 'P', lastName: 'R', email: 'p@f.com' },
      user: { id: 'u1', firstName: 'U', lastName: '1', email: 'u@f.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    prisma.printOrder.update.mockResolvedValue({
      id: 'order-1',
      status: PrintOrderStatus.DESIGN_REVIEW,
      orderNumber: 'PRT-1',
      listing,
      provider: { id: 'provider-1', firstName: 'P', lastName: 'R', email: 'p@f.com' },
      user: { id: 'u1', firstName: 'U', lastName: '1', email: 'u@f.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const updated = await service.updateOrderStatus(
      'order-1',
      { id: 'provider-1', email: 'p@f.com', roles: [UserRole.PRINTER] },
      { status: PrintOrderStatus.DESIGN_REVIEW, proofUrl: 'https://cdn.example/proof.png' },
    );
    expect(updated.status).toBe(PrintOrderStatus.DESIGN_REVIEW);
  });

  it('getProviderOrders returns paid orders', async () => {
    prisma.printOrder.findMany.mockResolvedValue([]);
    const orders = await service.getProviderOrders('provider-1');
    expect(orders).toEqual([]);
  });
});
