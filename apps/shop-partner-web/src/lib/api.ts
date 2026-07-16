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

export type ShopOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
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

export type InventoryMovement = {
  id: string;
  type: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  createdAt: string;
  product?: { id: string; name: string; slug: string };
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
    body: { productId: string; quantityChange: number; type: string; reason?: string },
  ) =>
    apiFetch<{ stockAfter: number }>(
      '/shop/inventory/adjust',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    ),

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
};
