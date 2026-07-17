const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(`Cannot reach API at ${API_URL}`, 0);
  }

  if (!response.ok) {
    let message = 'Something went wrong';
    try {
      const body = (await response.json()) as { message?: string | string[]; error?: string };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (typeof body.message === 'string') message = body.message;
      else if (typeof body.error === 'string') message = body.error;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
  tenantId?: string;
  tenantName?: string;
};

const AUTH_KEY = 'fitora.shop-partner.auth';

export function saveAuthSession(session: AuthSession) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function getAccessToken(): string | null {
  return getAuthSession()?.accessToken ?? null;
}

export type ShopProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: string;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  category?: { id: string; name: string; slug: string };
};

export type ShopOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  productSku: string | null;
  productPrice: string;
  quantity: number;
  lineTotal: string;
};

export type ShopOrder = {
  id: string;
  userId?: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotalAmount?: string;
  discountAmount?: string;
  shippingAmount?: string;
  totalAmount: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingPincode?: string;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  invoiceNumber?: string | null;
  items?: ShopOrderItem[];
  createdAt: string;
  updatedAt?: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
};

export type PartnerDashboard = {
  tenantId: string | null;
  productCount: number;
  activeProducts: number;
  lowStockCount: number;
  ordersTotal: number;
  ordersPending: number;
  ordersShipped: number;
  revenue: number;
};

export type CouponItem = {
  id: string;
  code: string;
  description: string | null;
  codeType: string;
  discountType: string;
  discountValue: string;
  isActive: boolean;
  usageCount: number;
  usageLimit: number | null;
  court?: { id: string; name: string } | null;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number | null;
  stock: number;
  attributes: Record<string, string> | null;
  isActive: boolean;
};

export type ProductReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerified: boolean;
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
};

export type InventoryMovement = {
  id: string;
  type: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  createdAt: string;
  product?: { id: string; name: string; slug: string; sku?: string | null };
  variant?: { id: string; name: string; sku: string | null } | null;
};

export const shopPartnerApi = {
  login: (email: string, password: string) =>
    apiFetch<{
      user: AuthSession['user'];
      tokens: { accessToken: string; refreshToken: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getTenantMe: (token: string) =>
    apiFetch<{ id: string; name: string; brandName?: string | null; status: string }>(
      '/tenants/me',
      {},
      token,
    ),

  getDashboard: (token: string) => apiFetch<PartnerDashboard>('/shop/partner/dashboard', {}, token),

  listProducts: (token: string) => apiFetch<ShopProduct[]>('/shop/products-admin/all', {}, token),

  getLowStock: (token: string) =>
    apiFetch<{ products: ShopProduct[]; variants: unknown[] }>(
      '/shop/inventory/low-stock',
      {},
      token,
    ),

  listInventoryMovements: (token: string, page = 1) =>
    apiFetch<{ items: InventoryMovement[]; total: number; page: number; totalPages: number }>(
      `/shop/inventory/movements?page=${page}`,
      {},
      token,
    ),

  adjustInventory: (
    token: string,
    body: {
      productId: string;
      quantityChange: number;
      type: string;
      reason?: string;
      variantId?: string;
    },
  ) =>
    apiFetch<{ stockAfter: number }>(
      '/shop/inventory/adjust',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    ),

  listVariants: (productId: string) =>
    apiFetch<ProductVariant[]>(`/shop/products/${productId}/variants`),

  updateVariant: (
    token: string,
    variantId: string,
    body: Partial<{
      name: string;
      sku: string;
      price: number;
      stock: number;
      attributes: Record<string, string>;
      isActive: boolean;
    }>,
  ) =>
    apiFetch<ProductVariant>(
      `/shop/variants/${variantId}`,
      { method: 'PUT', body: JSON.stringify(body) },
      token,
    ),

  createVariant: (
    token: string,
    productId: string,
    body: {
      name: string;
      sku?: string;
      price?: number;
      stock?: number;
      attributes?: Record<string, string>;
    },
  ) =>
    apiFetch<ProductVariant>(
      `/shop/products/${productId}/variants`,
      { method: 'POST', body: JSON.stringify(body) },
      token,
    ),

  getProductReviews: (slug: string) => apiFetch<ProductReview[]>(`/shop/products/${slug}/reviews`),

  listOrders: (token: string) => apiFetch<ShopOrder[]>('/shop/orders', {}, token),

  updateOrderStatus: (
    token: string,
    orderId: string,
    body: { status: string; trackingNumber?: string },
  ) =>
    apiFetch<ShopOrder>(
      `/shop/orders/${orderId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      token,
    ),

  listCoupons: (token: string, page = 1) =>
    apiFetch<{ items: CouponItem[]; total: number; page: number; totalPages: number }>(
      `/memberships/coupons?page=${page}`,
      {},
      token,
    ),

  listNotifications: (token: string, page = 1) =>
    apiFetch<{ items: NotificationItem[]; total: number; page: number }>(
      `/notifications?page=${page}`,
      {},
      token,
    ),

  unreadNotificationCount: (token: string) =>
    apiFetch<{ count: number }>('/notifications/unread-count', {}, token),

  getMerchantWallet: (token: string) =>
    apiFetch<
      Array<{
        id: string;
        role: string;
        available: number;
        pending: number;
        settled: number;
        lifetimeEarned: number;
      }>
    >('/wallet/merchant', {}, token),

  getSettlements: (token: string) =>
    apiFetch<
      Array<{
        id: string;
        gross: number;
        commission: number;
        net: number;
        status: string;
        periodStart: string;
        periodEnd: string;
        paidAt: string | null;
        invoiceNumber: string | null;
      }>
    >('/settlements', {}, token),

  getRevenueReport: (token: string) =>
    apiFetch<{
      revenue: number;
      commission: number;
      net: number;
      pending: number;
      available: number;
      settled: number;
      nextSettlementDate: string | null;
    }>('/reports/revenue', {}, token),
};
