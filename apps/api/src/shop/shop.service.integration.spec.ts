import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, PaymentEntityType, PaymentStatus, ShopOrderStatus, UserRole } from '@prisma/client';
import { ShopService } from './shop.service';
import { PaymentsService } from '../payments/payments.service';
import { CouponsService } from '../memberships/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { CacheService } from '../common/redis/cache.service';
import { mockCouponsService, mockNotificationsService, mockPaymentsService, mockCacheService } from '../../test/helpers/mock-deps';
import { createShopPrismaMock } from '../../test/helpers/shop-prisma.mock';
import { mockProduct } from '../../test/helpers/shop.fixtures';
import { asUser } from '../../test/helpers/auth.fixtures';

describe('ShopService (integration)', () => {
  let service: ShopService;
  let prisma: ReturnType<typeof createShopPrismaMock>;
  let payments: ReturnType<typeof mockPaymentsService>;
  let coupons: ReturnType<typeof mockCouponsService>;
  let notifications: ReturnType<typeof mockNotificationsService>;

  const now = new Date();

  function orderStub(overrides: Record<string, unknown> = {}) {
    return {
      id: 'order-1',
      userId: 'u1',
      orderNumber: 'ORD-1',
      totalAmount: 599,
      subtotalAmount: 500,
      discountAmount: 0,
      shippingAmount: 99,
      paymentStatus: PaymentStatus.PENDING,
      status: ShopOrderStatus.PENDING,
      shippingName: 'Test',
      shippingPhone: '9999999999',
      shippingAddress: '123 St',
      shippingCity: 'BLR',
      shippingPincode: '560001',
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      items: [],
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = createShopPrismaMock();
    payments = mockPaymentsService();
    coupons = mockCouponsService();
    notifications = mockNotificationsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: payments },
        { provide: CouponsService, useValue: coupons },
        { provide: NotificationsService, useValue: notifications },
        { provide: CacheService, useValue: mockCacheService() },
      ],
    }).compile();

    service = module.get(ShopService);
  });

  describe('product admin', () => {
    it('creates product with slug', async () => {
      prisma.product.create.mockResolvedValue(mockProduct({ slug: 'new-product' }) as never);

      const result = await service.createProduct({
        name: 'New Product',
        categoryId: 'cat-1',
        price: 499,
        stock: 10,
      });

      expect(result.slug).toBe('new-product');
    });

    it('rejects invalid sport on create', async () => {
      prisma.sport.findFirst.mockResolvedValue(null);
      await expect(
        service.createProduct({
          name: 'X',
          categoryId: 'cat-1',
          price: 100,
          sportId: 'bad-sport',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates and soft-deletes product', async () => {
      const updatedProduct = mockProduct({ name: 'Updated' });
      prisma.product.findFirst
        .mockResolvedValueOnce(mockProduct() as never)
        .mockResolvedValueOnce(updatedProduct as never);
      prisma.product.update.mockResolvedValue(updatedProduct as never);

      const updated = await service.updateProduct('prod-1', { name: 'Updated' });
      expect(updated.name).toBe('Updated');

      prisma.product.findFirst.mockResolvedValue(mockProduct() as never);
      prisma.product.update.mockResolvedValue({} as never);
      const deleted = await service.deleteProduct('prod-1');
      expect(deleted.success).toBe(true);
    });

    it('lists admin products', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct()] as never);
      const products = await service.getAllProductsAdmin();
      expect(products).toHaveLength(1);
    });
  });

  describe('variants and images', () => {
    it('creates and lists variants', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct() as never);
      prisma.productVariant.create.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        name: 'Large',
        sku: 'L',
        price: null,
        stock: 5,
        isActive: true,
      } as never);
      prisma.productVariant.findMany.mockResolvedValue([]);

      const variant = await service.createVariant('prod-1', { name: 'Large', sku: 'L', stock: 5 });
      expect(variant.name).toBe('Large');

      const variants = await service.listVariants('prod-1');
      expect(variants).toEqual([]);
    });

    it('updates and deletes variant', async () => {
      prisma.productVariant.findFirst.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
      } as never);
      prisma.productVariant.update.mockResolvedValue({ id: 'var-1', name: 'XL' } as never);
      prisma.productVariant.update.mockResolvedValue({} as never);

      await service.updateVariant('var-1', { name: 'XL' });
      const result = await service.deleteVariant('var-1');
      expect(result.success).toBe(true);
    });

    it('adds and deletes product images', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct() as never);
      prisma.productImage.createMany.mockResolvedValue({ count: 1 } as never);
      prisma.productImage.update.mockResolvedValue({} as never);

      await service.addProductImages('prod-1', [{ url: 'https://img.test/a.png' }]);
      const deleted = await service.deleteProductImage('img-1');
      expect(deleted.success).toBe(true);
    });
  });

  describe('cart operations', () => {
    it('adds item to new cart', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue({ id: 'cart-1', userId: 'u1', items: [] } as never);
      prisma.product.findFirst.mockResolvedValue(mockProduct() as never);
      prisma.cartItem.create.mockResolvedValue({ id: 'item-1', quantity: 1 } as never);
      prisma.cart.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'cart-1',
        items: [{ id: 'item-1', quantity: 1, product: mockProduct(), variant: null }],
      } as never);

      const cart = await service.addToCart('u1', { productId: 'prod-1', quantity: 1 });
      expect(cart.items).toBeDefined();
    });

    it('removes cart item and clears cart', async () => {
      prisma.cart.findUnique
        .mockResolvedValueOnce({
          id: 'cart-1',
          userId: 'u1',
          items: [{ id: 'item-1', productId: 'prod-1', variantId: null, quantity: 1 }],
        } as never)
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'u1', items: [] } as never)
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'u1' } as never);
      prisma.cartItem.delete.mockResolvedValue({} as never);
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 } as never);

      await service.removeCartItem('u1', 'item-1');
      await expect(service.clearCart('u1')).resolves.toBeUndefined();
    });
  });

  describe('wishlist', () => {
    it('getWishlist creates wishlist when absent', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);
      prisma.wishlist.create.mockResolvedValue({ id: 'wl-1', userId: 'u1', items: [] } as never);

      const result = await service.getWishlist('u1');
      expect(result.id).toBe('wl-1');
    });
  });

  describe('checkout', () => {
    it('checkout creates order and payment', async () => {
      const product = mockProduct({ stock: 10, price: '500' });
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'u1',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            variantId: null,
            quantity: 1,
            product: { ...product, category: product.category },
            variant: null,
          },
        ],
      } as never);

      coupons.resolveCoupon.mockResolvedValue({ coupon: null, discountAmount: 0, finalAmount: 599 });
      prisma.shopOrder.create.mockResolvedValue(orderStub({ id: 'order-1', totalAmount: 599 }) as never);

      const result = await service.checkout('u1', {
        shippingName: 'Test User',
        shippingPhone: '9999999999',
        shippingAddress: '123 St',
        shippingCity: 'BLR',
        shippingPincode: '560001',
      });

      expect(result.order.id).toBe('order-1');
      expect(payments.createPaymentOrder).toHaveBeenCalledWith(
        'u1',
        599,
        PaymentEntityType.SHOP_ORDER,
        'order-1',
      );
    });

    it('checkout applies coupon discount', async () => {
      const product = mockProduct({ stock: 10, price: '1000' });
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'u1',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            variantId: null,
            quantity: 1,
            product: { ...product, category: product.category },
            variant: null,
          },
        ],
      } as never);

      coupons.resolveCoupon.mockResolvedValue({
        coupon: { id: 'coupon-1' },
        discountAmount: 100,
        finalAmount: 999,
      });
      prisma.shopOrder.create.mockResolvedValue(
        orderStub({ id: 'order-2', totalAmount: 999, discountAmount: 100, couponId: 'coupon-1' }) as never,
      );

      const result = await service.checkout('u1', {
        couponCode: 'SAVE10',
        shippingName: 'Test',
        shippingPhone: '9999999999',
        shippingAddress: '123 St',
        shippingCity: 'BLR',
        shippingPincode: '560001',
      });

      expect(result.order.totalAmount).toBe('999');
    });
  });

  describe('confirmAfterPayment', () => {
    it('confirms order and decrements stock', async () => {
      prisma.shopOrder.findUnique
        .mockResolvedValueOnce({
          id: 'order-1',
          userId: 'u1',
          orderNumber: 'ORD-1',
          paymentStatus: PaymentStatus.PENDING,
          couponId: null,
          discountAmount: 0,
          subtotalAmount: 500,
          shippingAmount: 99,
          totalAmount: 599,
          items: [
            {
              productId: 'prod-1',
              variantId: null,
              productName: 'Shuttlecock',
              quantity: 2,
            },
          ],
        } as never)
        .mockResolvedValueOnce({
          id: 'order-1',
          paymentStatus: PaymentStatus.PAID,
          items: [],
          invoice: { id: 'inv-1' },
        } as never);

      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', stock: 10 } as never);
      prisma.product.update.mockResolvedValue({} as never);
      prisma.inventoryMovement.create.mockResolvedValue({} as never);
      prisma.shopOrder.update.mockResolvedValue({} as never);
      prisma.shopInvoice.create.mockResolvedValue({} as never);
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 } as never);

      const order = await service.confirmAfterPayment('order-1');
      expect(order?.paymentStatus).toBe(PaymentStatus.PAID);
      expect(notifications.notifyOrderConfirmed).toHaveBeenCalled();
    });

    it('returns early when already paid', async () => {
      const paidOrder = { id: 'order-1', paymentStatus: PaymentStatus.PAID, items: [] };
      prisma.shopOrder.findUnique.mockResolvedValue(paidOrder as never);

      const result = await service.confirmAfterPayment('order-1');
      expect(result).toEqual(paidOrder);
    });

    it('throws when order not found', async () => {
      prisma.shopOrder.findUnique.mockResolvedValue(null);
      await expect(service.confirmAfterPayment('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('orders', () => {
    it('getMyOrders returns user orders', async () => {
      prisma.shopOrder.findMany.mockResolvedValue([]);
      const orders = await service.getMyOrders('u1');
      expect(orders).toEqual([]);
    });

    it('getOrder allows owner access', async () => {
      prisma.shopOrder.findFirst.mockResolvedValue(orderStub({ userId: 'player-1' }) as never);

      const order = await service.getOrder('order-1', asUser('player'));
      expect(order.id).toBe('order-1');
    });

    it('getOrder forbids other users', async () => {
      prisma.shopOrder.findFirst.mockResolvedValue(orderStub({ userId: 'other' }) as never);

      await expect(
        service.getOrder('order-1', asUser('player')),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('updateOrderStatus as admin', async () => {
      prisma.shopOrder.findUnique.mockResolvedValue(
        orderStub({ userId: 'u1', status: ShopOrderStatus.CONFIRMED }) as never,
      );
      prisma.shopOrder.update.mockResolvedValue(
        orderStub({ status: ShopOrderStatus.PROCESSING }) as never,
      );

      const updated = await service.updateOrderStatus(
        'order-1',
        { status: ShopOrderStatus.PROCESSING },
        { id: 'admin-1', email: 'a@f.com', roles: [UserRole.ADMIN] },
      );
      expect(updated.status).toBe(ShopOrderStatus.PROCESSING);
    });
  });

  describe('inventory and reviews', () => {
    it('getLowStockProducts returns low stock items', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct({ stock: 2, lowStockThreshold: 5 })] as never);
      prisma.productVariant.findMany.mockResolvedValue([]);

      const result = await service.getLowStockProducts();
      expect(result.products).toHaveLength(1);
    });

    it('adjustInventory creates movement', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct({ stock: 10 }) as never);
      prisma.product.update.mockResolvedValue(mockProduct({ stock: 15 }) as never);
      prisma.inventoryMovement.create.mockResolvedValue({} as never);

      const result = await service.adjustInventory(
        {
          productId: 'prod-1',
          quantityChange: 5,
          type: InventoryMovementType.RESTOCK,
          reason: 'Restock',
        },
        asUser('admin'),
      );
      expect(result.stockAfter).toBe(15);
    });

    it('listInventoryMovements paginates', async () => {
      prisma.inventoryMovement.findMany.mockResolvedValue([]);
      prisma.inventoryMovement.count.mockResolvedValue(0);

      const result = await service.listInventoryMovements({ page: 1 });
      expect(result.total).toBe(0);
    });

    it('getProductReviews returns reviews', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct() as never);
      prisma.review.findMany.mockResolvedValue([
        {
          id: 'r1',
          rating: 5,
          title: 'Great',
          comment: 'Nice',
          isVerified: true,
          user: { id: 'u1', firstName: 'A', lastName: 'B' },
          createdAt: now,
        },
      ] as never);

      const reviews = await service.getProductReviews('shuttlecock');
      expect(reviews).toHaveLength(1);
      expect(reviews[0].rating).toBe(5);
    });
  });
});
