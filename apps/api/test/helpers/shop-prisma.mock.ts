import { mockProduct } from './shop.fixtures';

export function createShopPrismaMock() {
  const prisma = {
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
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
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
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    sport: { findFirst: jest.fn() },
    wishlist: { findUnique: jest.fn(), create: jest.fn() },
    wishlistItem: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn() },
    review: { findMany: jest.fn(), upsert: jest.fn(), aggregate: jest.fn() },
    inventoryMovement: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    shopInvoice: { create: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      const tx = {
        productVariant: prisma.productVariant,
        product: prisma.product,
        inventoryMovement: prisma.inventoryMovement,
        shopOrder: prisma.shopOrder,
        shopInvoice: prisma.shopInvoice,
        cartItem: prisma.cartItem,
      };
      return arg(tx);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  prisma.productCategory.findFirst.mockResolvedValue({
    id: 'cat-1',
    name: 'Gear',
    slug: 'gear',
    isActive: true,
    deletedAt: null,
  });
  prisma.product.findUnique.mockResolvedValue(null);
  prisma.product.findFirst.mockResolvedValue(mockProduct());

  return prisma;
}
