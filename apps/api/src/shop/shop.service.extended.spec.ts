import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShopService } from './shop.service';
import { PaymentsService } from '../payments/payments.service';
import { CouponsService } from '../memberships/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { CacheService } from '../common/redis/cache.service';
import {
  mockCouponsService,
  mockNotificationsService,
  mockPaymentsService,
  mockCacheService,
} from '../../test/helpers/mock-deps';
import { TenantsService } from '../tenants/tenants.service';
import { mockProduct } from '../../test/helpers/shop.fixtures';

describe('ShopService (extended)', () => {
  let service: ShopService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      productCategory: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      productVariant: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productImage: {
        createMany: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cart: { findUnique: jest.fn(), create: jest.fn() },
      cartItem: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
      shopOrder: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      sport: { findFirst: jest.fn() },
      wishlist: { findUnique: jest.fn(), create: jest.fn() },
      wishlistItem: { create: jest.fn(), delete: jest.fn() },
      review: { findMany: jest.fn(), upsert: jest.fn(), aggregate: jest.fn() },
      inventoryMovement: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
      shopInvoice: { create: jest.fn(), findUnique: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: mockPaymentsService() },
        { provide: CouponsService, useValue: mockCouponsService() },
        { provide: NotificationsService, useValue: mockNotificationsService() },
        { provide: CacheService, useValue: mockCacheService() },
        {
          provide: TenantsService,
          useValue: { resolveTenantId: jest.fn().mockResolvedValue('tenant-1') },
        },
      ],
    }).compile();

    service = module.get(ShopService);
  });

  it('findProducts returns paginated catalog', async () => {
    prisma.product.findMany.mockResolvedValue([mockProduct()] as never);
    prisma.product.count.mockResolvedValue(1);

    const result = await service.findProducts({ search: 'shuttle' });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('findProductBySlug returns product', async () => {
    prisma.product.findFirst.mockResolvedValue(mockProduct() as never);
    const result = await service.findProductBySlug('shuttlecock');
    expect(result.slug).toBe('shuttlecock');
  });

  it('findProductBySlug throws when missing', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.findProductBySlug('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createCategory creates category', async () => {
    prisma.productCategory.create.mockResolvedValue({
      id: 'cat-1',
      name: 'Gear',
      slug: 'gear',
      description: null,
      imageUrl: null,
      sortOrder: 1,
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: 0 },
    } as never);

    const result = await service.createCategory({ name: 'Gear', slug: 'gear' } as any);
    expect(result.name).toBe('Gear');
  });

  it('getWishlist creates wishlist when absent', async () => {
    prisma.wishlist.findUnique.mockResolvedValue(null);
    prisma.wishlist.create.mockResolvedValue({ id: 'wl-1', userId: 'u1', items: [] } as never);

    const result = await service.getWishlist('u1');
    expect(result.id).toBe('wl-1');
  });

  it('validateCoupon delegates to coupons service', async () => {
    const coupons = mockCouponsService();
    coupons.validateForUser.mockResolvedValue({ valid: true, discountAmount: 50 });

    const module = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: mockPaymentsService() },
        { provide: CouponsService, useValue: coupons },
        { provide: NotificationsService, useValue: mockNotificationsService() },
        { provide: CacheService, useValue: mockCacheService() },
      ],
    }).compile();
    const shop = module.get(ShopService);

    const result = await shop.validateCoupon('u1', 'SAVE10', 500);
    expect(result.valid).toBe(true);
  });

  it('updateCartItem rejects insufficient stock', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      userId: 'u1',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          variantId: null,
          quantity: 1,
          product: { ...mockProduct(), stock: 2, variants: [] },
          variant: null,
        },
      ],
    } as never);

    await expect(service.updateCartItem('u1', 'item-1', 99)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
