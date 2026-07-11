import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ShopController } from '../../src/shop/shop.controller';
import { ShopService } from '../../src/shop/shop.service';
import { closeTestApp, createTestApp } from '../helpers/create-test-app';

const PRODUCT_ID = '77777777-7777-4777-8777-777777777777';

describe('Shop API (integration)', () => {
  let app: INestApplication;
  const shopService = {
    listCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    listProducts: jest.fn(),
    findProducts: jest.fn(),
    getProductBySlug: jest.fn(),
    createProduct: jest.fn(),
    listAdminProducts: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    listVariants: jest.fn(),
    createVariant: jest.fn(),
    updateVariant: jest.fn(),
    deleteVariant: jest.fn(),
    addProductImage: jest.fn(),
    deleteProductImage: jest.fn(),
    getCart: jest.fn(),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    getWishlist: jest.fn(),
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
    validateCoupon: jest.fn(),
    checkout: jest.fn(),
    getMyOrders: jest.fn(),
    getOrder: jest.fn(),
    getOrderInvoice: jest.fn(),
    listAdminOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
    adjustInventory: jest.fn(),
    listInventoryMovements: jest.fn(),
    createReview: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const fixture = await createTestApp({
      controllers: [ShopController],
      providers: [{ provide: ShopService, useValue: shopService }],
    });
    app = fixture.app;
  });

  afterEach(async () => closeTestApp(app));

  it('GET /api/v1/shop/categories is public', async () => {
    shopService.listCategories.mockResolvedValue([{ id: 'cat-1', name: 'Gear' }]);

    const res = await request(app.getHttpServer()).get('/api/v1/shop/categories').expect(200);

    expect(res.body[0].name).toBe('Gear');
  });

  it('GET /api/v1/shop/products lists products publicly', async () => {
    shopService.findProducts.mockResolvedValue({ items: [], total: 0 });

    await request(app.getHttpServer()).get('/api/v1/shop/products').expect(200);
  });

  it('GET /api/v1/shop/cart requires auth', async () => {
    await request(app.getHttpServer()).get('/api/v1/shop/cart').expect(401);
  });

  it('GET /api/v1/shop/cart returns cart for user', async () => {
    shopService.getCart.mockResolvedValue({ id: 'cart-1', items: [] });

    const res = await request(app.getHttpServer())
      .get('/api/v1/shop/cart')
      .set('x-test-role', 'player')
      .expect(200);

    expect(res.body.id).toBe('cart-1');
  });

  it('POST /api/v1/shop/cart/items adds item', async () => {
    shopService.addToCart.mockResolvedValue({ id: 'cart-1', items: [{ quantity: 1 }] });

    await request(app.getHttpServer())
      .post('/api/v1/shop/cart/items')
      .set('x-test-role', 'player')
      .send({ productId: PRODUCT_ID, quantity: 1 })
      .expect(201);
  });

  it('POST /api/v1/shop/checkout creates order', async () => {
    shopService.checkout.mockResolvedValue({
      order: { id: 'order-1' },
      payment: { paymentId: 'pay-1' },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/shop/checkout')
      .set('x-test-role', 'player')
      .send({
        shippingName: 'Test User',
        shippingPhone: '9999999999',
        shippingAddress: '123 St',
        shippingCity: 'Bangalore',
        shippingPincode: '560001',
      })
      .expect(201);

    expect(res.body.order.id).toBe('order-1');
  });

  it('POST /api/v1/shop/categories requires admin', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/shop/categories')
      .set('x-test-role', 'player')
      .send({ name: 'New', slug: 'new' })
      .expect(403);
  });
});
