import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ShopService } from './shop.service';
import { PaymentsService } from '../payments/payments.service';
import { CouponsService } from '../memberships/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { CacheService } from '../common/redis/cache.service';
import { mockCouponsService, mockNotificationsService, mockPaymentsService, mockCacheService } from '../../test/helpers/mock-deps';

describe('ShopService', () => {
  let service: ShopService;
  let prisma: jest.Mocked<
    Pick<
      PrismaService,
      | 'productCategory'
      | 'product'
      | 'productVariant'
      | 'productImage'
      | 'cart'
      | 'cartItem'
      | 'shopOrder'
      | 'sport'
      | 'wishlist'
      | 'wishlistItem'
      | 'review'
      | 'inventoryMovement'
      | 'shopInvoice'
      | '$transaction'
    >
  >;

  beforeEach(async () => {
    prisma = {
      productCategory: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      productVariant: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      productImage: { createMany: jest.fn(), updateMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      cart: { findUnique: jest.fn(), create: jest.fn() },
      cartItem: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
      shopOrder: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
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
      ],
    }).compile();

    service = module.get(ShopService);
  });

  describe('listCategories', () => {
    it('returns formatted categories', async () => {
      prisma.productCategory.findMany.mockResolvedValue([
        {
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
          _count: { products: 3 },
        },
      ] as never);

      const result = await service.listCategories();
      expect(result[0].name).toBe('Gear');
      expect(result[0].productCount).toBe(3);
    });
  });

  describe('checkout', () => {
    it('rejects empty cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'u1', items: [] } as never);
      await expect(
        service.checkout('u1', {
          shippingName: 'Test',
          shippingPhone: '9999999999',
          shippingAddress: '123 St',
          shippingCity: 'Bangalore',
          shippingPincode: '560001',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getCart', () => {
    it('creates cart when missing', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue({
        id: 'cart-new',
        userId: 'u1',
        items: [],
      } as never);

      const cart = await service.getCart('u1');
      expect(cart.id).toBe('cart-new');
    });
  });

  describe('addToCart', () => {
    it('rejects inactive product', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        isActive: false,
        variants: [],
        stockQuantity: 10,
      } as never);

      await expect(
        service.addToCart('u1', { productId: 'prod-1', quantity: 1 }),
      ).rejects.toThrow('Product unavailable');
    });
  });
});
