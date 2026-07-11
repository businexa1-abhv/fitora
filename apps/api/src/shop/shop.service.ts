import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CouponAppliesTo,
  InventoryMovementType,
  PaymentEntityType,
  PaymentStatus,
  Prisma,
  ReviewTargetType,
  ShopOrderStatus,
  UserRole,
} from '@prisma/client';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CacheService } from '../common/redis/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/redis/cache.constants';
import { optimizeImageUrl } from '../common/utils/cdn.util';
import {
  buildCursorPaginatedResult,
  decodeCursor,
  hashQueryParams,
} from '../common/utils/cursor-pagination.util';
import { CouponsService } from '../memberships/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.module';
import { TenantsService } from '../tenants/tenants.service';
import {
  AddToCartDto,
  AdjustInventoryDto,
  CheckoutDto,
  CreateCategoryDto,
  CreateProductDto,
  CreateReviewDto,
  ProductImageDto,
  ProductVariantDto,
  UpdateCategoryDto,
  UpdateOrderStatusDto,
  UpdateProductDto,
  UpdateVariantDto,
  WishlistItemDto,
} from './dto/shop.dto';

const PRODUCT_INCLUDE = {
  category: true,
  sport: { select: { id: true, name: true, slug: true } },
  images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' as const } },
  variants: { where: { deletedAt: null, isActive: true }, orderBy: { name: 'asc' as const } },
} satisfies Prisma.ProductInclude;

const CART_PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  sport: { select: { id: true, name: true, slug: true } },
  images: {
    where: { deletedAt: null },
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
    take: 1,
    select: { id: true, url: true, altText: true, isPrimary: true, sortOrder: true },
  },
  variants: { where: { deletedAt: null }, take: 0 },
} satisfies Prisma.ProductInclude;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FS-${ts}-${rand}`;
}

function generateInvoiceNumber(orderNumber: string): string {
  return `INV-${orderNumber}`;
}

function mapCategorySlugToLegacy(slug: string): string {
  const upper = slug.replace(/-/g, '_').toUpperCase();
  const allowed = ['GEAR', 'APPAREL', 'TROPHIES', 'ACCESSORIES', 'OTHER'];
  return allowed.includes(upper) ? upper : 'OTHER';
}

@Injectable()
export class ShopService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private couponsService: CouponsService,
    private notificationsService: NotificationsService,
    private cacheService: CacheService,
    private tenantsService: TenantsService,
  ) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  async listCategories(activeOnly = true) {
    const tenantId = await this.resolveShopTenantId();
    return this.cacheService.getOrSet(
      `${CACHE_KEYS.categories()}:${tenantId}`,
      CACHE_TTL.CATEGORIES,
      async () => {
        const categories = await this.prisma.productCategory.findMany({
          where: { tenantId, deletedAt: null, ...(activeOnly && { isActive: true }) },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: { _count: { select: { products: { where: { deletedAt: null, isActive: true } } } } },
        });
        return categories.map((c) => this.formatCategory(c));
      },
    );
  }

  async createCategory(dto: CreateCategoryDto) {
    const tenantId = await this.resolveShopTenantId(true);
    const slug = slugify(dto.name);
    return this.prisma.productCategory.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    }).then((c) => this.formatCategory(c));
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.getCategoryOrThrow(id);
    const category = await this.prisma.productCategory.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        ...(dto.name && { slug: slugify(dto.name) }),
      },
    });
    return this.formatCategory(category);
  }

  async deleteCategory(id: string) {
    await this.getCategoryOrThrow(id);
    await this.prisma.productCategory.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }

  // ─── Products ───────────────────────────────────────────────────────────────

  async findProducts(params?: {
    categorySlug?: string;
    categoryId?: string;
    sportSlug?: string;
    search?: string;
    featured?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const tenantId = await this.resolveShopTenantId();

    const where: Prisma.ProductWhereInput = {
      tenantId,
      isActive: true,
      deletedAt: null,
      ...(params?.categorySlug && { category: { slug: params.categorySlug } }),
      ...(params?.categoryId && { categoryId: params.categoryId }),
      ...(params?.sportSlug && { sport: { slug: params.sportSlug } }),
      ...(params?.featured && { isFeatured: true }),
      ...(params?.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
          { sku: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const cacheKey = CACHE_KEYS.productsList(`${tenantId}:${hashQueryParams(params ?? {})}`);

    return this.cacheService.getOrSet(cacheKey, CACHE_TTL.PRODUCTS_LIST, async () => {
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: PRODUCT_INCLUDE,
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.product.count({ where }),
      ]);

      return {
        items: items.map((p) => this.formatProduct(p)),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    });
  }

  async findProductsCursor(params?: {
    categorySlug?: string;
    categoryId?: string;
    sportSlug?: string;
    search?: string;
    featured?: boolean;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params?.limit ?? 20;
    const tenantId = await this.resolveShopTenantId();
    const filters: Prisma.ProductWhereInput[] = [
      {
        tenantId,
        isActive: true,
        deletedAt: null,
        ...(params?.categorySlug && { category: { slug: params.categorySlug } }),
        ...(params?.categoryId && { categoryId: params.categoryId }),
        ...(params?.sportSlug && { sport: { slug: params.sportSlug } }),
        ...(params?.featured && { isFeatured: true }),
      },
    ];

    if (params?.search) {
      filters.push({
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
          { sku: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }

    const decoded = params?.cursor ? decodeCursor(params.cursor) : null;
    if (decoded) {
      filters.push({
        OR: [
          { createdAt: { lt: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { lt: decoded.id } },
        ],
      });
    }

    const where: Prisma.ProductWhereInput = { AND: filters };

    const items = await this.prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    return buildCursorPaginatedResult(
      items.map((p) => ({ ...this.formatProduct(p), createdAt: p.createdAt })),
      limit,
    );
  }

  async findProductBySlug(slug: string) {
    const tenantId = await this.resolveShopTenantId();
    const product = await this.prisma.product.findFirst({
      where: { tenantId, slug, isActive: true, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.formatProduct(product);
  }

  async findProductEntity(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    const tenantId = await this.resolveShopTenantId(true);
    await this.getCategoryOrThrow(dto.categoryId, tenantId);
    if (dto.sportId) {
      const sport = await this.prisma.sport.findFirst({ where: { id: dto.sportId } });
      if (!sport) throw new BadRequestException('Invalid sport');
    }

    const baseSlug = slugify(dto.name);
    let slug = baseSlug;
    let suffix = 1;
    while (
      await this.prisma.product.findFirst({ where: { tenantId, slug, deletedAt: null } })
    ) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        description: dto.description,
        categoryId: dto.categoryId,
        sportId: dto.sportId,
        sku: dto.sku,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        stock: dto.stock ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
        isFeatured: dto.isFeatured ?? false,
        images: dto.images?.length
          ? { create: dto.images.map((img, i) => this.imageCreateData(img, i)) }
          : undefined,
        variants: dto.variants?.length
          ? { create: dto.variants.map((v) => this.variantCreateData(v)) }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
    });

    return this.formatProduct(product);
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.findProductEntity(id);

    if (dto.categoryId) await this.getCategoryOrThrow(dto.categoryId);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        sportId: dto.sportId,
        sku: dto.sku,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        stock: dto.stock,
        lowStockThreshold: dto.lowStockThreshold,
        isActive: dto.isActive,
        isFeatured: dto.isFeatured,
      },
      include: PRODUCT_INCLUDE,
    });

    if (dto.images?.length) {
      await this.prisma.productImage.updateMany({
        where: { productId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      await this.prisma.productImage.createMany({
        data: dto.images.map((img, i) => ({
          productId: id,
          url: img.url,
          altText: img.altText,
          isPrimary: img.isPrimary ?? i === 0,
          sortOrder: img.sortOrder ?? i,
        })),
      });
    }

    return this.formatProduct(await this.findProductEntity(id));
  }

  async deleteProduct(id: string) {
    await this.findProductEntity(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }

  async getAllProductsAdmin() {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => this.formatProduct(p));
  }

  // ─── Variants ───────────────────────────────────────────────────────────────

  async listVariants(productId: string) {
    await this.findProductEntity(productId);
    const variants = await this.prisma.productVariant.findMany({
      where: { productId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return variants.map((v) => this.formatVariant(v));
  }

  async createVariant(productId: string, dto: ProductVariantDto) {
    await this.findProductEntity(productId);
    const variant = await this.prisma.productVariant.create({
      data: { productId, ...this.variantCreateData(dto) },
    });
    return this.formatVariant(variant);
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto) {
    const variant = await this.getVariantOrThrow(variantId);
    const updated = await this.prisma.productVariant.update({
      where: { id: variant.id },
      data: {
        name: dto.name,
        sku: dto.sku,
        price: dto.price,
        stock: dto.stock,
        attributes: dto.attributes as Prisma.InputJsonValue,
        isActive: dto.isActive,
      },
    });
    return this.formatVariant(updated);
  }

  async deleteVariant(variantId: string) {
    await this.getVariantOrThrow(variantId);
    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }

  async addProductImages(productId: string, images: ProductImageDto[]) {
    await this.findProductEntity(productId);
    const created = await this.prisma.$transaction(
      images.map((img, i) =>
        this.prisma.productImage.create({
          data: { productId, ...this.imageCreateData(img, i) },
        }),
      ),
    );
    return created;
  }

  async deleteProductImage(imageId: string) {
    await this.prisma.productImage.update({
      where: { id: imageId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  // ─── Cart ───────────────────────────────────────────────────────────────────

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: CART_PRODUCT_INCLUDE },
            variant: true,
          },
        },
      },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: { include: CART_PRODUCT_INCLUDE },
              variant: true,
            },
          },
        },
      });
    }
    return this.formatCart(cart);
  }

  async getCart(userId: string) {
    return this.getOrCreateCart(userId);
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const product = await this.findProductEntity(dto.productId);
    if (!product.isActive) throw new BadRequestException('Product unavailable');

    const qty = dto.quantity ?? 1;
    const { unitPrice, availableStock } = await this.resolveStock(product, dto.variantId);

    if (availableStock < qty) throw new BadRequestException('Insufficient stock');

    const cartRaw = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    const cart =
      cartRaw ??
      (await this.prisma.cart.create({ data: { userId }, include: { items: true } }));

    const existing = cart.items.find(
      (i) => i.productId === dto.productId && (i.variantId ?? null) === (dto.variantId ?? null),
    );

    if (existing) {
      const newQty = existing.quantity + qty;
      if (availableStock < newQty) throw new BadRequestException('Insufficient stock');
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId,
          quantity: qty,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, quantity: number) {
    const cartRaw = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cartRaw) throw new NotFoundException('Cart not found');

    const item = cartRaw.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');

    const { availableStock } = await this.resolveStock(item.product, item.variantId);
    if (availableStock < quantity) throw new BadRequestException('Insufficient stock');

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getOrCreateCart(userId);
  }

  async removeCartItem(userId: string, itemId: string) {
    const cartRaw = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    if (!cartRaw) throw new NotFoundException('Cart not found');
    const item = cartRaw.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }

  // ─── Wishlist ───────────────────────────────────────────────────────────────

  private async getOrCreateWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: PRODUCT_INCLUDE },
            variant: true,
          },
        },
      },
    });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: { include: PRODUCT_INCLUDE },
              variant: true,
            },
          },
        },
      });
    }
    return wishlist;
  }

  async getWishlist(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    return {
      id: wishlist.id,
      userId: wishlist.userId,
      items: wishlist.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        product: this.formatProduct(item.product),
        variant: item.variant ? this.formatVariant(item.variant) : null,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  async addToWishlist(userId: string, dto: WishlistItemDto) {
    await this.findProductEntity(dto.productId);
    if (dto.variantId) await this.getVariantOrThrow(dto.variantId);

    const wishlist = await this.getOrCreateWishlist(userId);
    const existing = wishlist.items.find(
      (i) =>
        i.productId === dto.productId && (i.variantId ?? null) === (dto.variantId ?? null),
    );
    if (!existing) {
      await this.prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId: dto.productId,
          variantId: dto.variantId,
        },
      });
    }
    return this.getWishlist(userId);
  }

  async removeWishlistItem(userId: string, itemId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = wishlist.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Wishlist item not found');
    await this.prisma.wishlistItem.delete({ where: { id: itemId } });
    return this.getWishlist(userId);
  }

  // ─── Checkout & orders ──────────────────────────────────────────────────────

  async validateCoupon(userId: string, code: string, orderAmount: number) {
    return this.couponsService.validateForUser(code, {
      userId,
      orderAmount,
      appliesTo: CouponAppliesTo.SHOP_ORDER,
    });
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const cartRaw = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: { include: { category: true } }, variant: true },
        },
      },
    });
    if (!cartRaw || cartRaw.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let subtotal = 0;
    const lineItems: {
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      productSku: string | null;
      productPrice: number;
      quantity: number;
      lineTotal: number;
    }[] = [];

    for (const item of cartRaw.items) {
      if (!item.product?.isActive) {
        throw new BadRequestException(`${item.product?.name ?? 'Item'} is unavailable`);
      }
      const { unitPrice, availableStock } = await this.resolveStock(item.product, item.variantId);
      if (availableStock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.product.name}`);
      }
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      lineItems.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        variantName: item.variant?.name ?? null,
        productSku: item.variant?.sku ?? item.product.sku,
        productPrice: unitPrice,
        quantity: item.quantity,
        lineTotal,
      });
    }

    const shippingAmount = subtotal >= 999 ? 0 : 99;

    let discountAmount = 0;
    let couponId: string | null = null;

    if (dto.couponCode) {
      const resolved = await this.couponsService.resolveCoupon(dto.couponCode, {
        userId,
        orderAmount: subtotal + shippingAmount,
        appliesTo: CouponAppliesTo.SHOP_ORDER,
      });
      discountAmount = resolved.discountAmount;
      couponId = resolved.coupon?.id ?? null;
    }

    const totalAmount = Math.max(0, subtotal + shippingAmount - discountAmount);
    const orderNumber = generateOrderNumber();

    const order = await this.prisma.shopOrder.create({
      data: {
        userId,
        orderNumber,
        couponId,
        totalAmount,
        subtotalAmount: subtotal,
        discountAmount,
        shippingAmount,
        paymentStatus: PaymentStatus.PENDING,
        status: ShopOrderStatus.PENDING,
        shippingName: dto.shippingName,
        shippingPhone: dto.shippingPhone,
        shippingAddress: dto.shippingAddress,
        shippingCity: dto.shippingCity,
        shippingPincode: dto.shippingPincode,
        items: {
          create: lineItems.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            productName: line.productName,
            variantName: line.variantName,
            productSku: line.productSku,
            productPrice: line.productPrice,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    const payment = await this.paymentsService.createPaymentOrder(
      userId,
      totalAmount,
      PaymentEntityType.SHOP_ORDER,
      order.id,
    );

    return {
      order: this.formatOrder(order),
      payment,
    };
  }

  /** Called by PaymentsService after successful payment */
  async confirmAfterPayment(orderId: string) {
    const order = await this.prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) return order;

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant || variant.stock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${item.productName}`);
          }
          const stockAfter = variant.stock - item.quantity;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: stockAfter },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              type: InventoryMovementType.SALE,
              quantityChange: -item.quantity,
              stockBefore: variant.stock,
              stockAfter,
              referenceType: 'SHOP_ORDER',
              referenceId: order.id,
            },
          });
        } else {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || product.stock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${item.productName}`);
          }
          const stockAfter = product.stock - item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: stockAfter },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: InventoryMovementType.SALE,
              quantityChange: -item.quantity,
              stockBefore: product.stock,
              stockAfter,
              referenceType: 'SHOP_ORDER',
              referenceId: order.id,
            },
          });
        }
      }

      await tx.shopOrder.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.PAID, status: ShopOrderStatus.CONFIRMED },
      });

      await tx.shopInvoice.create({
        data: {
          orderId: order.id,
          invoiceNumber: generateInvoiceNumber(order.orderNumber),
          subtotal: order.subtotalAmount,
          discount: order.discountAmount,
          shipping: order.shippingAmount,
          total: order.totalAmount,
        },
      });

      await tx.cartItem.deleteMany({
        where: { cart: { userId: order.userId } },
      });
    });

    if (order.couponId) {
      await this.couponsService.applyRedemption(
        order.couponId,
        order.userId,
        PaymentEntityType.SHOP_ORDER,
        order.id,
        Number(order.discountAmount),
      );
    }

    await this.notificationsService.notifyOrderConfirmed(order.userId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: Number(order.totalAmount),
    });

    return this.prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true, invoice: true },
    });
  }

  async getMyOrders(userId: string) {
    const orders = await this.prisma.shopOrder.findMany({
      where: { userId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: { items: true, invoice: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.formatOrder(o));
  }

  async getOrder(orderId: string, user: AuthUserPayload) {
    const order = await this.prisma.shopOrder.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { items: true, invoice: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Access denied');
    }
    return this.formatOrder(order);
  }

  async getInvoice(orderId: string, user: AuthUserPayload) {
    const order = await this.getOrder(orderId, user);
    const invoice = await this.prisma.shopInvoice.findUnique({ where: { orderId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      discount: Number(invoice.discount),
      shipping: Number(invoice.shipping),
      total: Number(invoice.total),
      issuedAt: invoice.issuedAt.toISOString(),
      order,
    };
  }

  async getAllOrdersAdmin() {
    const orders = await this.prisma.shopOrder.findMany({
      where: { paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: {
        items: true,
        invoice: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => ({
      ...this.formatOrder(o),
      user: (o as typeof o & { user: unknown }).user,
    }));
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, user: AuthUserPayload) {
    if (!user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Admin only');
    }

    const data: Prisma.ShopOrderUpdateInput = {
      status: dto.status,
      ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
      ...(dto.status === ShopOrderStatus.SHIPPED && { shippedAt: new Date() }),
      ...(dto.status === ShopOrderStatus.DELIVERED && { deliveredAt: new Date() }),
    };

    const order = await this.prisma.shopOrder.update({
      where: { id: orderId },
      data,
      include: { items: true, invoice: true },
    });

    if (dto.status === ShopOrderStatus.SHIPPED) {
      await this.notificationsService.notifyOrderShipped(order.userId, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        trackingNumber: dto.trackingNumber,
      });
    }

    return this.formatOrder(order);
  }

  // ─── Reviews ────────────────────────────────────────────────────────────────

  async getProductReviews(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const reviews = await this.prisma.review.findMany({
      where: {
        targetType: ReviewTargetType.PRODUCT,
        targetId: product.id,
        isPublished: true,
        deletedAt: null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      isVerified: r.isVerified,
      user: r.user,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createProductReview(slug: string, userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const paidOrder = await this.prisma.shopOrderItem.findFirst({
      where: {
        productId: product.id,
        order: { userId, paymentStatus: PaymentStatus.PAID },
      },
    });

    const review = await this.prisma.review.upsert({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: ReviewTargetType.PRODUCT,
          targetId: product.id,
        },
      },
      create: {
        userId,
        targetType: ReviewTargetType.PRODUCT,
        targetId: product.id,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        isVerified: !!paidOrder,
      },
      update: {
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        isVerified: !!paidOrder,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    const agg = await this.prisma.review.aggregate({
      where: {
        targetType: ReviewTargetType.PRODUCT,
        targetId: product.id,
        isPublished: true,
        deletedAt: null,
      },
      _avg: { rating: true },
    });

    await this.prisma.product.update({
      where: { id: product.id },
      data: { averageRating: agg._avg.rating ?? null },
    });

    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerified: review.isVerified,
      user: review.user,
      createdAt: review.createdAt.toISOString(),
    };
  }

  // ─── Inventory ──────────────────────────────────────────────────────────────

  async getLowStockProducts() {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      include: PRODUCT_INCLUDE,
    });

    const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
    const lowVariants = await this.prisma.productVariant.findMany({
      where: { deletedAt: null, isActive: true, stock: { lte: 5 } },
      include: { product: { select: { id: true, name: true, slug: true } } },
    });

    return {
      products: lowStock.map((p) => this.formatProduct(p as never)),
      variants: lowVariants.map((v) => ({ ...this.formatVariant(v), product: v.product })),
    };
  }

  async listInventoryMovements(params?: { productId?: string; page?: number; pageSize?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const where: Prisma.InventoryMovementWhereInput = {
      ...(params?.productId && { productId: params.productId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, name: true, sku: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async adjustInventory(dto: AdjustInventoryDto, user: AuthUserPayload) {
    if (!user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Admin only');
    }

    if (dto.variantId) {
      const variant = await this.getVariantOrThrow(dto.variantId);
      const stockAfter = variant.stock + dto.quantityChange;
      if (stockAfter < 0) throw new BadRequestException('Stock cannot be negative');

      await this.prisma.$transaction([
        this.prisma.productVariant.update({
          where: { id: dto.variantId },
          data: { stock: stockAfter },
        }),
        this.prisma.inventoryMovement.create({
          data: {
            productId: dto.productId,
            variantId: dto.variantId,
            type: dto.type,
            quantityChange: dto.quantityChange,
            stockBefore: variant.stock,
            stockAfter,
            reason: dto.reason,
            createdById: user.id,
          },
        }),
      ]);
      return { stockAfter };
    }

    const product = await this.findProductEntity(dto.productId);
    const stockAfter = product.stock + dto.quantityChange;
    if (stockAfter < 0) throw new BadRequestException('Stock cannot be negative');

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: dto.productId },
        data: { stock: stockAfter },
      }),
      this.prisma.inventoryMovement.create({
        data: {
          productId: dto.productId,
          type: dto.type,
          quantityChange: dto.quantityChange,
          stockBefore: product.stock,
          stockAfter,
          reason: dto.reason,
          createdById: user.id,
        },
      }),
    ]);

    return { stockAfter };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async getCategoryOrThrow(id: string, tenantId?: string) {
    const resolvedTenantId = tenantId ?? (await this.resolveShopTenantId());
    const category = await this.prisma.productCategory.findFirst({
      where: { id, tenantId: resolvedTenantId, deletedAt: null },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async resolveShopTenantId(requireExplicit = false): Promise<string> {
    const fromContext = this.tenantsService.resolveTenantIdFromContext();
    if (fromContext) return fromContext;
    if (requireExplicit) {
      throw new BadRequestException('Tenant context required (X-Tenant-Id or X-Tenant-Slug header)');
    }

    const platform = await this.prisma.tenant.findFirst({
      where: { slug: 'platform', deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!platform) {
      throw new BadRequestException('Default tenant not configured');
    }
    return platform.id;
  }

  private async getVariantOrThrow(id: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, deletedAt: null },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    return variant;
  }

  private async resolveStock(
    product: { id: string; stock: number; price: Prisma.Decimal; sku: string | null },
    variantId?: string | null,
  ) {
    if (variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: variantId, productId: product.id, deletedAt: null, isActive: true },
      });
      if (!variant) throw new BadRequestException('Invalid variant');
      return {
        unitPrice: Number(variant.price ?? product.price),
        availableStock: variant.stock,
        sku: variant.sku ?? product.sku,
      };
    }
    return {
      unitPrice: Number(product.price),
      availableStock: product.stock,
      sku: product.sku,
    };
  }

  private imageCreateData(img: ProductImageDto, index: number) {
    return {
      url: img.url,
      altText: img.altText,
      isPrimary: img.isPrimary ?? index === 0,
      sortOrder: img.sortOrder ?? index,
    };
  }

  private variantCreateData(v: ProductVariantDto) {
    return {
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock ?? 0,
      attributes: v.attributes as Prisma.InputJsonValue,
    };
  }

  private formatCategory(c: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    _count?: { products: number };
  }) {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: c._count?.products ?? 0,
    };
  }

  private formatVariant(v: {
    id: string;
    productId: string;
    name: string;
    sku: string | null;
    price: Prisma.Decimal | null;
    stock: number;
    attributes: Prisma.JsonValue;
    isActive: boolean;
  }) {
    return {
      id: v.id,
      productId: v.productId,
      name: v.name,
      sku: v.sku,
      price: v.price ? Number(v.price) : null,
      stock: v.stock,
      attributes: v.attributes,
      isActive: v.isActive,
    };
  }

  private formatProduct(
    p: Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>,
  ) {
    const primaryImage = p.images.find((i) => i.isPrimary) ?? p.images[0];
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      sku: p.sku,
      price: String(p.price),
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : null,
      costPrice: p.costPrice ? String(p.costPrice) : null,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      averageRating: p.averageRating ? Number(p.averageRating) : null,
      categoryId: p.categoryId,
      category: mapCategorySlugToLegacy(p.category.slug),
      categoryDetail: this.formatCategory(p.category),
      sport: p.sport,
      sportType: p.sport?.slug?.toUpperCase().replace(/-/g, '_') ?? null,
      images: p.images.map((i) => optimizeImageUrl(i.url, { width: 600, quality: 80, format: 'webp' }) ?? i.url),
      imageDetails: p.images.map((i) => ({
        id: i.id,
        url: optimizeImageUrl(i.url, { width: 800, quality: 85, format: 'webp' }) ?? i.url,
        thumbnailUrl: optimizeImageUrl(i.url, { width: 300, quality: 75, format: 'webp' }) ?? i.url,
        altText: i.altText,
        isPrimary: i.isPrimary,
        sortOrder: i.sortOrder,
      })),
      variants: p.variants.map((v) => this.formatVariant(v)),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private formatCart(cart: {
    id: string;
    userId: string;
    items: Array<{
      id: string;
      cartId: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      product: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        sku: string | null;
        price: Prisma.Decimal;
        compareAtPrice: Prisma.Decimal | null;
        costPrice: Prisma.Decimal | null;
        stock: number;
        lowStockThreshold: number;
        isActive: boolean;
        isFeatured: boolean;
        averageRating: Prisma.Decimal | null;
        categoryId: string;
        createdAt: Date;
        updatedAt: Date;
        category: { id: string; name: string; slug: string };
        sport: { id: string; name: string; slug: string } | null;
        images: Array<{
          id: string;
          url: string;
          altText: string | null;
          isPrimary: boolean;
          sortOrder: number;
        }>;
        variants: Array<{
          id: string;
          name: string;
          sku: string | null;
          price: Prisma.Decimal | null;
          stock: number;
          attributes: Prisma.JsonValue;
          isActive: boolean;
        }>;
      };
      variant: { id: string; name: string; price: Prisma.Decimal | null; stock: number } | null;
    }>;
  }) {
    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items.map((item) => ({
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        product: this.formatProduct(item.product as Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>),
        variant: item.variant ? this.formatVariant(item.variant as never) : null,
      })),
    };
  }

  private formatOrder(order: {
    id: string;
    userId: string;
    orderNumber: string;
    status: ShopOrderStatus;
    paymentStatus: PaymentStatus;
    subtotalAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    shippingAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    shippingCity: string;
    shippingPincode: string;
    trackingNumber: string | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      orderId: string;
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      productSku: string | null;
      productPrice: Prisma.Decimal;
      quantity: number;
      lineTotal: Prisma.Decimal;
    }>;
    invoice?: { invoiceNumber: string } | null;
  }) {
    return {
      id: order.id,
      userId: order.userId,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotalAmount: String(order.subtotalAmount),
      discountAmount: String(order.discountAmount),
      shippingAmount: String(order.shippingAmount),
      totalAmount: String(order.totalAmount),
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingPincode: order.shippingPincode,
      trackingNumber: order.trackingNumber,
      shippedAt: order.shippedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      invoiceNumber: order.invoice?.invoiceNumber ?? null,
      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        productSku: item.productSku,
        productPrice: String(item.productPrice),
        quantity: item.quantity,
        lineTotal: String(item.lineTotal),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
