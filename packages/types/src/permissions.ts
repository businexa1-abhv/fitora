import { UserRole } from './roles';

export enum Permission {
  // Users
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  USERS_MANAGE_ROLES = 'users:manage_roles',

  // Courts & bookings
  COURTS_READ = 'courts:read',
  COURTS_WRITE = 'courts:write',
  COURTS_APPROVE = 'courts:approve',
  COURTS_DELETE = 'courts:delete',
  BOOKINGS_READ = 'bookings:read',
  BOOKINGS_WRITE = 'bookings:write',
  BOOKINGS_MANAGE = 'bookings:manage',

  // Memberships
  MEMBERSHIPS_READ = 'memberships:read',
  MEMBERSHIPS_WRITE = 'memberships:write',
  MEMBERSHIPS_MANAGE = 'memberships:manage',

  // Training
  TRAINING_READ = 'training:read',
  TRAINING_WRITE = 'training:write',
  TRAINING_MANAGE = 'training:manage',
  ATTENDANCE_WRITE = 'attendance:write',
  PROGRESS_WRITE = 'progress:write',

  // Shop
  SHOP_READ = 'shop:read',
  SHOP_WRITE = 'shop:write',
  SHOP_MANAGE = 'shop:manage',
  ORDERS_READ = 'orders:read',
  ORDERS_MANAGE = 'orders:manage',

  // Marketplace
  SERVICES_READ = 'services:read',
  SERVICES_WRITE = 'services:write',
  SERVICES_MANAGE = 'services:manage',
  PRINT_READ = 'print:read',
  PRINT_WRITE = 'print:write',
  PRINT_MANAGE = 'print:manage',

  // Platform
  PAYMENTS_READ = 'payments:read',
  PAYMENTS_REFUND = 'payments:refund',
  FINANCE_READ = 'finance:read',
  FINANCE_WRITE = 'finance:write',
  SETTLEMENTS_READ = 'settlements:read',
  SETTLEMENTS_PROCESS = 'settlements:process',
  SUBSCRIPTIONS_MANAGE = 'subscriptions:manage',
  COUPONS_MANAGE = 'coupons:manage',
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',
  AUDIT_READ = 'audit:read',
  NOTIFICATIONS_READ = 'notifications:read',
  NOTIFICATIONS_SEND = 'notifications:send',

  // Tenants (multi-tenant SaaS)
  TENANTS_READ = 'tenants:read',
  TENANTS_WRITE = 'tenants:write',
  TENANTS_MANAGE = 'tenants:manage',

  // AI
  AI_USE = 'ai:use',
  AI_INSIGHTS = 'ai:insights',

  // Community Hub
  COMMUNITY_READ = 'community:read',
  COMMUNITY_WRITE = 'community:write',
  COMMUNITY_MODERATE = 'community:moderate',
  COMMUNITY_MANAGE = 'community:manage',
}

export const ALL_PERMISSIONS = Object.values(Permission);

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: ALL_PERMISSIONS,

  [UserRole.COURT_OWNER]: [
    Permission.COURTS_READ,
    Permission.COURTS_WRITE,
    Permission.COURTS_DELETE,
    Permission.BOOKINGS_READ,
    Permission.BOOKINGS_MANAGE,
    Permission.MEMBERSHIPS_READ,
    Permission.MEMBERSHIPS_WRITE,
    Permission.MEMBERSHIPS_MANAGE,
    Permission.TRAINING_READ,
    Permission.TRAINING_WRITE,
    Permission.TRAINING_MANAGE,
    Permission.ATTENDANCE_WRITE,
    Permission.PROGRESS_WRITE,
    Permission.PAYMENTS_READ,
    Permission.FINANCE_READ,
    Permission.SETTLEMENTS_READ,
    Permission.SUBSCRIPTIONS_MANAGE,
    Permission.NOTIFICATIONS_READ,
    Permission.ORDERS_READ,
    Permission.TENANTS_READ,
    Permission.TENANTS_WRITE,
    Permission.SHOP_READ,
    Permission.SHOP_WRITE,
    Permission.SHOP_MANAGE,
    Permission.AI_USE,
    Permission.AI_INSIGHTS,
    Permission.COMMUNITY_READ,
    Permission.COMMUNITY_WRITE,
    Permission.COMMUNITY_MODERATE,
    Permission.COMMUNITY_MANAGE,
  ],

  [UserRole.TRAINER]: [
    Permission.COURTS_READ,
    Permission.BOOKINGS_READ,
    Permission.TRAINING_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.PROGRESS_WRITE,
    Permission.NOTIFICATIONS_READ,
    Permission.AI_USE,
    Permission.AI_INSIGHTS,
    Permission.COMMUNITY_READ,
    Permission.COMMUNITY_WRITE,
    Permission.COMMUNITY_MODERATE,
  ],

  [UserRole.PLAYER]: [
    Permission.COURTS_READ,
    Permission.BOOKINGS_READ,
    Permission.BOOKINGS_WRITE,
    Permission.MEMBERSHIPS_READ,
    Permission.TRAINING_READ,
    Permission.TRAINING_WRITE,
    Permission.SHOP_READ,
    Permission.ORDERS_READ,
    Permission.SERVICES_READ,
    Permission.PRINT_READ,
    Permission.PAYMENTS_READ,
    Permission.NOTIFICATIONS_READ,
    Permission.AI_USE,
    Permission.COMMUNITY_READ,
    Permission.COMMUNITY_WRITE,
  ],

  [UserRole.SERVICE_PROVIDER]: [
    Permission.SERVICES_READ,
    Permission.SERVICES_WRITE,
    Permission.SERVICES_MANAGE,
    Permission.ORDERS_READ,
    Permission.PAYMENTS_READ,
    Permission.FINANCE_READ,
    Permission.SETTLEMENTS_READ,
    Permission.NOTIFICATIONS_READ,
  ],

  [UserRole.PRINTER]: [
    Permission.PRINT_READ,
    Permission.PRINT_WRITE,
    Permission.PRINT_MANAGE,
    Permission.ORDERS_READ,
    Permission.PAYMENTS_READ,
    Permission.FINANCE_READ,
    Permission.SETTLEMENTS_READ,
    Permission.NOTIFICATIONS_READ,
  ],
};

export function getPermissionsForRoles(roles: UserRole[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      set.add(permission);
    }
  }
  return [...set];
}

export function hasPermission(roles: UserRole[], required: Permission): boolean {
  return getPermissionsForRoles(roles).includes(required);
}

export function hasAnyPermission(roles: UserRole[], required: Permission[]): boolean {
  const userPermissions = getPermissionsForRoles(roles);
  return required.some((p) => userPermissions.includes(p));
}

export const REGISTERABLE_ROLES: UserRole[] = [
  UserRole.PLAYER,
  UserRole.COURT_OWNER,
  UserRole.TRAINER,
  UserRole.SERVICE_PROVIDER,
  UserRole.PRINTER,
];
