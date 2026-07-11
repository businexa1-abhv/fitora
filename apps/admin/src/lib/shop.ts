import type {
  PaginatedResponse,
  Product,
  ShopCategory,
  ShopOrder,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getAdminCategories(token: string) {
  return apiFetch<ShopCategory[]>('/shop/categories', {}, token);
}

export function createCategory(
  token: string,
  data: { name: string; description?: string; imageUrl?: string; sortOrder?: number },
) {
  return apiFetch<ShopCategory>('/shop/categories', { method: 'POST', body: JSON.stringify(data) }, token);
}

export function getAdminProducts(token: string) {
  return apiFetch<Product[]>('/shop/products-admin/all', {}, token);
}

export function createProduct(
  token: string,
  data: {
    name: string;
    categoryId: string;
    price: number;
    description?: string;
    stock?: number;
    compareAtPrice?: number;
    images?: { url: string; altText?: string }[];
  },
) {
  return apiFetch<Product>('/shop/products', { method: 'POST', body: JSON.stringify(data) }, token);
}

export function updateProduct(token: string, id: string, data: Record<string, unknown>) {
  return apiFetch<Product>(`/shop/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
}

export function deleteProduct(token: string, id: string) {
  return apiFetch<{ success: boolean }>(`/shop/products/${id}`, { method: 'DELETE' }, token);
}

export function getAdminOrders(token: string) {
  return apiFetch<(ShopOrder & { user?: { firstName: string; lastName: string; email: string } })[]>(
    '/shop/orders',
    {},
    token,
  );
}

export function updateOrderStatus(
  token: string,
  orderId: string,
  data: { status: string; trackingNumber?: string },
) {
  return apiFetch<ShopOrder>(
    `/shop/orders/${orderId}/status`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token,
  );
}

export function getLowStock(token: string) {
  return apiFetch<{ products: Product[]; variants: unknown[] }>(
    '/shop/inventory/low-stock',
    {},
    token,
  );
}

export function adjustInventory(
  token: string,
  data: {
    productId: string;
    variantId?: string;
    quantityChange: number;
    type: string;
    reason?: string;
  },
) {
  return apiFetch<{ stockAfter: number }>(
    '/shop/inventory/adjust',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function getInventoryMovements(token: string, productId?: string) {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<PaginatedResponse<Record<string, unknown>>>(
    `/shop/inventory/movements${qs}`,
    {},
    token,
  );
}

export function getCoupons(token: string) {
  return apiFetch<{ items: Record<string, unknown>[] }>('/memberships/coupons', {}, token);
}

export function createCoupon(token: string, data: Record<string, unknown>) {
  return apiFetch<Record<string, unknown>>(
    '/memberships/coupons',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}
