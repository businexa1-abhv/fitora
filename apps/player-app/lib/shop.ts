import type {
  Cart,
  PaginatedResponse,
  PrintCheckoutResponse,
  PrintDesignUpload,
  PrintListing,
  Product,
  ServiceListing,
  ShopCheckoutResponse,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getProducts(params?: { category?: string; search?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return apiFetch<PaginatedResponse<Product>>(`/shop/products${qs ? `?${qs}` : ''}`);
}

export function getProduct(slug: string) {
  return apiFetch<Product>(`/shop/products/${slug}`);
}

export function getCart(token: string) {
  return apiFetch<Cart>('/shop/cart', {}, token);
}

export function addToCart(token: string, productId: string, quantity = 1) {
  return apiFetch<Cart>(
    '/shop/cart/items',
    {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    },
    token,
  );
}

export function updateCartItem(token: string, itemId: string, quantity: number) {
  return apiFetch<Cart>(
    `/shop/cart/items/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    },
    token,
  );
}

export function removeCartItem(token: string, itemId: string) {
  return apiFetch<Cart>(`/shop/cart/items/${itemId}`, { method: 'DELETE' }, token);
}

export function checkout(
  token: string,
  data: {
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    shippingCity: string;
    shippingPincode: string;
  },
) {
  return apiFetch<ShopCheckoutResponse>(
    '/shop/checkout',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export function getMyShopOrders(token: string) {
  return apiFetch('/shop/orders/my', {}, token);
}

export function getServiceListing(id: string) {
  return apiFetch<ServiceListing>(`/services/listings/${id}`);
}

export function getServiceListings(params?: { category?: string; search?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return apiFetch<PaginatedResponse<ServiceListing>>(`/services/listings${qs ? `?${qs}` : ''}`);
}

export function bookService(
  token: string,
  listingId: string,
  data: {
    pickupAddress: string;
    pickupPhone: string;
    pickupCity: string;
    customerNotes?: string;
    equipmentDetails?: string;
    rentalStartDate?: string;
    rentalEndDate?: string;
  },
) {
  return apiFetch<{ payment: import('@fitora/shared').PaymentOrder }>(
    `/services/listings/${listingId}/book`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export function getMyServiceOrders(token: string) {
  return apiFetch('/services/orders/my', {}, token);
}

export function getPrintListing(id: string) {
  return apiFetch<PrintListing>(`/print/listings/${id}`);
}

export function getPrintListings(params?: { search?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return apiFetch<PaginatedResponse<PrintListing>>(`/print/listings${qs ? `?${qs}` : ''}`);
}

export function uploadPrintDesign(
  token: string,
  data: { fileName: string; mimeType: string; dataBase64: string },
) {
  return apiFetch<PrintDesignUpload>(
    '/print/designs/upload',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export function createPrintOrder(
  token: string,
  listingId: string,
  data: {
    designUrl: string;
    tshirtSize: string;
    tshirtColor?: string;
    quantity?: number;
    customText?: string;
    pickupAddress: string;
    pickupPhone: string;
    pickupCity: string;
    customerNotes?: string;
  },
) {
  return apiFetch<PrintCheckoutResponse>(
    `/print/listings/${listingId}/orders`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export function getMyPrintOrders(token: string) {
  return apiFetch('/print/orders/my', {}, token);
}
