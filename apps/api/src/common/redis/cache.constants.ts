export const CACHE_PREFIX = 'fitora:cache:';

export const CACHE_TTL = {
  SPORTS: 3600,
  CATEGORIES: 1800,
  PRODUCTS_LIST: 300,
  COURTS_LIST: 300,
  ANALYTICS_DASHBOARD: 600,
  SLOT_AVAILABILITY: 60,
} as const;

export const CACHE_KEYS = {
  sports: () => `${CACHE_PREFIX}sports`,
  categories: () => `${CACHE_PREFIX}shop:categories`,
  productsList: (hash: string) => `${CACHE_PREFIX}shop:products:${hash}`,
  courtsList: (hash: string) => `${CACHE_PREFIX}courts:list:${hash}`,
  analyticsDashboard: (period: string, from?: string, to?: string) =>
    `${CACHE_PREFIX}analytics:dashboard:${period}:${from ?? ''}:${to ?? ''}`,
} as const;
