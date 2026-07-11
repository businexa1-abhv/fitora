import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ServiceCategory } from '@prisma/client';
import { ServicesService } from './services.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: jest.Mocked<Pick<PrismaService, 'serviceListing' | 'serviceOrder' | 'sport'>>;

  beforeEach(async () => {
    prisma = {
      serviceListing: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
      serviceOrder: { create: jest.fn() },
      sport: { findUnique: jest.fn() },
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: { createPaymentOrder: jest.fn() } },
        { provide: NotificationsService, useValue: { notifyServiceOrderUpdate: jest.fn() } },
      ],
    }).compile();

    service = module.get(ServicesService);
  });

  it('returns service categories', () => {
    expect(service.getCategories()).toContain(ServiceCategory.STRINGING);
  });

  describe('bookService', () => {
    it('requires rental dates for equipment rental', async () => {
      prisma.serviceListing.findFirst.mockResolvedValue({
        id: 'listing-1',
        providerId: 'provider-1',
        category: ServiceCategory.EQUIPMENT_RENTAL,
        price: 500,
        isActive: true,
        deletedAt: null,
      } as never);

      await expect(
        service.bookService('user-1', 'listing-1', {
          pickupAddress: '123 Main',
          pickupPhone: '9999999999',
          pickupCity: 'Bangalore',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findListings', () => {
    it('returns paginated listings', async () => {
      prisma.serviceListing.findMany.mockResolvedValue([]);
      prisma.serviceListing.count.mockResolvedValue(0);

      const result = await service.findListings({ page: 1 });
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('createListing', () => {
    it('creates listing for service provider', async () => {
      prisma.sport.findUnique.mockResolvedValue({ id: 'sport-1', slug: 'badminton' } as never);
      prisma.serviceListing.create.mockResolvedValue({
        id: 'listing-1',
        title: 'Pro Stringing',
        category: ServiceCategory.STRINGING,
        price: 500,
        providerId: 'provider-1',
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Fast',
        city: 'Bangalore',
        turnaroundDays: 2,
        sportId: 'sport-1',
        sport: { id: 'sport-1', name: 'Badminton', slug: 'badminton' },
        provider: { id: 'provider-1', firstName: 'P', lastName: 'R', email: 'p@f.com' },
        _count: { orders: 0, reviews: 0 },
      } as never);

      const result = await service.createListing(
        { id: 'provider-1', email: 'p@f.com', roles: ['SERVICE_PROVIDER' as never] },
        {
          title: 'Pro Stringing',
          category: ServiceCategory.STRINGING,
          description: 'Fast',
          price: 500,
          sportSlug: 'badminton',
          turnaroundDays: 2,
        },
      );

      expect(result.title).toBe('Pro Stringing');
    });
  });
});
