import type {
  Cart,
  PaginatedResponse,
  Product,
  ProductReview,
  ShopCategory,
  ShopCheckoutResponse,
  ShopInvoice,
  ShopOrder,
  Wishlist,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getCategories() {
  return apiFetch<ShopCategory[]>('/shop/categories');
}

export function getProducts(params?: {
  category?: string;
  categoryId?: string;
  sport?: string;
  search?: string;
  featured?: boolean;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (params?.sport) query.set('sport', params.sport);
  if (params?.search) query.set('search', params.search);
  if (params?.featured) query.set('featured', 'true');
  if (params?.page) query.set('page', String(params.page));

  const qs = query.toString();
  return apiFetch<PaginatedResponse<Product>>(`/shop/products${qs ? `?${qs}` : ''}`);
}

export function getProduct(slug: string) {
  return apiFetch<Product>(`/shop/products/${slug}`);
}

export function getProductReviews(slug: string) {
  return apiFetch<ProductReview[]>(`/shop/products/${slug}/reviews`);
}

export function createProductReview(
  token: string,
  slug: string,
  data: { rating: number; title?: string; comment?: string },
) {
  return apiFetch<ProductReview>(
    `/shop/products/${slug}/reviews`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function getCart(token: string) {
  return apiFetch<Cart>('/shop/cart', {}, token);
}

export function addToCart(token: string, productId: string, quantity = 1, variantId?: string) {
  return apiFetch<Cart>(
    '/shop/cart/items',
    { method: 'POST', body: JSON.stringify({ productId, quantity, variantId }) },
    token,
  );
}

export function updateCartItem(token: string, itemId: string, quantity: number) {
  return apiFetch<Cart>(
    `/shop/cart/items/${itemId}`,
    { method: 'PATCH', body: JSON.stringify({ quantity }) },
    token,
  );
}

export function removeCartItem(token: string, itemId: string) {
  return apiFetch<Cart>(`/shop/cart/items/${itemId}`, { method: 'DELETE' }, token);
}

export function getWishlist(token: string) {
  return apiFetch<Wishlist>('/shop/wishlist', {}, token);
}

export function addToWishlist(token: string, productId: string, variantId?: string) {
  return apiFetch<Wishlist>(
    '/shop/wishlist/items',
    { method: 'POST', body: JSON.stringify({ productId, variantId }) },
    token,
  );
}

export function removeWishlistItem(token: string, itemId: string) {
  return apiFetch<Wishlist>(`/shop/wishlist/items/${itemId}`, { method: 'DELETE' }, token);
}

export function validateShopCoupon(token: string, code: string, orderAmount: number) {
  return apiFetch<{
    valid: boolean;
    discountAmount: number;
    finalAmount: number;
    code: string;
  }>('/shop/validate-coupon', { method: 'POST', body: JSON.stringify({ code, orderAmount }) }, token);
}

export function checkout(
  token: string,
  data: {
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    shippingCity: string;
    shippingPincode: string;
    couponCode?: string;
  },
) {
  return apiFetch<ShopCheckoutResponse>(
    '/shop/checkout',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function getMyOrders(token: string) {
  return apiFetch<ShopOrder[]>('/shop/orders/my', {}, token);
}

export function getOrder(token: string, orderId: string) {
  return apiFetch<ShopOrder>(`/shop/orders/${orderId}`, {}, token);
}

export function getOrderInvoice(token: string, orderId: string) {
  return apiFetch<ShopInvoice>(`/shop/orders/${orderId}/invoice`, {}, token);
}
