import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, UserRole } from '@fitora/types';
import { Public, RequirePermissions, Roles } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  AddToCartDto,
  AdjustInventoryDto,
  CheckoutDto,
  CreateCategoryDto,
  CreateProductDto,
  CreateReviewDto,
  ProductImageDto,
  ProductVariantDto,
  UpdateCartItemDto,
  UpdateCategoryDto,
  UpdateOrderStatusDto,
  UpdateProductDto,
  UpdateVariantDto,
  ValidateShopCouponDto,
  WishlistItemDto,
} from './dto/shop.dto';
import { ShopService } from './shop.service';

@ApiTags('shop')
@Controller()
export class ShopController {
  constructor(private shopService: ShopService) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  @Public()
  @Get('shop/categories')
  @ApiOperation({ summary: 'List product categories' })
  listCategories() {
    return this.shopService.listCategories();
  }

  @Post('shop/categories')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.shopService.createCategory(dto);
  }

  @Put('shop/categories/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.shopService.updateCategory(id, dto);
  }

  @Delete('shop/categories/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  deleteCategory(@Param('id') id: string) {
    return this.shopService.deleteCategory(id);
  }

  // ─── Products ───────────────────────────────────────────────────────────────

  @Public()
  @Get('shop/products/cursor')
  @ApiOperation({ summary: 'Browse products with cursor pagination' })
  findProductsCursor(
    @Query('category') categorySlug?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sport') sportSlug?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shopService.findProductsCursor({
      categorySlug,
      categoryId,
      sportSlug,
      search,
      featured: featured === 'true',
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Public()
  @Get('shop/products')
  @ApiOperation({ summary: 'Browse products' })
  findProducts(
    @Query('category') categorySlug?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sport') sportSlug?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
    @Query('page') page?: string,
  ) {
    return this.shopService.findProducts({
      categorySlug,
      categoryId,
      sportSlug,
      search,
      featured: featured === 'true',
      page: page ? Number(page) : undefined,
    });
  }

  @Public()
  @Get('shop/products/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findProduct(@Param('slug') slug: string) {
    return this.shopService.findProductBySlug(slug);
  }

  @Post('shop/products')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  createProduct(@Body() dto: CreateProductDto) {
    return this.shopService.createProduct(dto);
  }

  @Get('shop/products-admin/all')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  getAllProducts() {
    return this.shopService.getAllProductsAdmin();
  }

  @Put('shop/products/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.shopService.updateProduct(id, dto);
  }

  @Delete('shop/products/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  deleteProduct(@Param('id') id: string) {
    return this.shopService.deleteProduct(id);
  }

  // ─── Variants & images ──────────────────────────────────────────────────────

  @Public()
  @Get('shop/products/:productId/variants')
  listVariants(@Param('productId') productId: string) {
    return this.shopService.listVariants(productId);
  }

  @Post('shop/products/:productId/variants')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  createVariant(@Param('productId') productId: string, @Body() dto: ProductVariantDto) {
    return this.shopService.createVariant(productId, dto);
  }

  @Put('shop/variants/:variantId')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  updateVariant(@Param('variantId') variantId: string, @Body() dto: UpdateVariantDto) {
    return this.shopService.updateVariant(variantId, dto);
  }

  @Delete('shop/variants/:variantId')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  deleteVariant(@Param('variantId') variantId: string) {
    return this.shopService.deleteVariant(variantId);
  }

  @Post('shop/products/:productId/images')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  addImages(@Param('productId') productId: string, @Body() images: ProductImageDto[]) {
    return this.shopService.addProductImages(productId, images);
  }

  @Delete('shop/images/:imageId')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  deleteImage(@Param('imageId') imageId: string) {
    return this.shopService.deleteProductImage(imageId);
  }

  // ─── Cart ───────────────────────────────────────────────────────────────────

  @Get('shop/cart')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  getCart(@CurrentUser() user: AuthUserPayload) {
    return this.shopService.getCart(user.id);
  }

  @Post('shop/cart/items')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  addToCart(@CurrentUser() user: AuthUserPayload, @Body() dto: AddToCartDto) {
    return this.shopService.addToCart(user.id, dto);
  }

  @Patch('shop/cart/items/:itemId')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  updateCartItem(
    @CurrentUser() user: AuthUserPayload,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.shopService.updateCartItem(user.id, itemId, dto.quantity);
  }

  @Delete('shop/cart/items/:itemId')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  removeCartItem(@CurrentUser() user: AuthUserPayload, @Param('itemId') itemId: string) {
    return this.shopService.removeCartItem(user.id, itemId);
  }

  // ─── Wishlist ───────────────────────────────────────────────────────────────

  @Get('shop/wishlist')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  getWishlist(@CurrentUser() user: AuthUserPayload) {
    return this.shopService.getWishlist(user.id);
  }

  @Post('shop/wishlist/items')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  addToWishlist(@CurrentUser() user: AuthUserPayload, @Body() dto: WishlistItemDto) {
    return this.shopService.addToWishlist(user.id, dto);
  }

  @Delete('shop/wishlist/items/:itemId')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  removeWishlistItem(@CurrentUser() user: AuthUserPayload, @Param('itemId') itemId: string) {
    return this.shopService.removeWishlistItem(user.id, itemId);
  }

  // ─── Checkout & orders ──────────────────────────────────────────────────────

  @Post('shop/validate-coupon')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  validateCoupon(@CurrentUser() user: AuthUserPayload, @Body() dto: ValidateShopCouponDto) {
    return this.shopService.validateCoupon(user.id, dto.code, dto.orderAmount);
  }

  @Post('shop/checkout')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  checkout(@CurrentUser() user: AuthUserPayload, @Body() dto: CheckoutDto) {
    return this.shopService.checkout(user.id, dto);
  }

  @Get('shop/orders/my')
  @RequirePermissions(Permission.ORDERS_READ)
  @ApiBearerAuth('access-token')
  getMyOrders(@CurrentUser() user: AuthUserPayload) {
    return this.shopService.getMyOrders(user.id);
  }

  @Get('shop/orders/:orderId')
  @RequirePermissions(Permission.ORDERS_READ)
  @ApiBearerAuth('access-token')
  getOrder(@CurrentUser() user: AuthUserPayload, @Param('orderId') orderId: string) {
    return this.shopService.getOrder(orderId, user);
  }

  @Get('shop/orders/:orderId/invoice')
  @RequirePermissions(Permission.ORDERS_READ)
  @ApiBearerAuth('access-token')
  getInvoice(@CurrentUser() user: AuthUserPayload, @Param('orderId') orderId: string) {
    return this.shopService.getInvoice(orderId, user);
  }

  @Get('shop/orders')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ORDERS_MANAGE)
  @ApiBearerAuth('access-token')
  getAllOrders() {
    return this.shopService.getAllOrdersAdmin();
  }

  @Patch('shop/orders/:id/status')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ORDERS_MANAGE)
  @ApiBearerAuth('access-token')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.shopService.updateOrderStatus(id, dto, user);
  }

  // ─── Reviews ────────────────────────────────────────────────────────────────

  @Public()
  @Get('shop/products/:slug/reviews')
  getReviews(@Param('slug') slug: string) {
    return this.shopService.getProductReviews(slug);
  }

  @Post('shop/products/:slug/reviews')
  @RequirePermissions(Permission.SHOP_READ)
  @ApiBearerAuth('access-token')
  createReview(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.shopService.createProductReview(slug, user.id, dto);
  }

  // ─── Inventory (admin) ──────────────────────────────────────────────────────

  @Get('shop/inventory/low-stock')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  getLowStock() {
    return this.shopService.getLowStockProducts();
  }

  @Get('shop/inventory/movements')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  listMovements(
    @Query('productId') productId?: string,
    @Query('page') page?: string,
  ) {
    return this.shopService.listInventoryMovements({
      productId,
      page: page ? Number(page) : undefined,
    });
  }

  @Post('shop/inventory/adjust')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.SHOP_MANAGE)
  @ApiBearerAuth('access-token')
  adjustInventory(@CurrentUser() user: AuthUserPayload, @Body() dto: AdjustInventoryDto) {
    return this.shopService.adjustInventory(dto, user);
  }
}
