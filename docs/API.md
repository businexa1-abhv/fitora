# FitOra Dashboard API Reference

REST endpoints used by the **Admin**, **Owner**, **Trainer**, **Provider**, and **Printer** dashboards. All routes are prefixed with `/api/v1` and require a Bearer access token unless noted.

**Multi-tenant requests:** pass `X-Tenant-Id` or `X-Tenant-Slug` to scope data to a tenant. See [MULTI_TENANCY.md](./MULTI_TENANCY.md).

Interactive Swagger docs are available at `GET /api/docs` when the API is running.

---

## Shared list query parameters

Paginated list endpoints accept `AdminListQueryDto` query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number (1-based) |
| `pageSize` | number | `20` | Items per page (max 100) |
| `search` | string | — | Case-insensitive free-text search |
| `status` | string | — | Filter by entity status |
| `sortBy` | string | varies | Sort field (see endpoint) |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction |

**Paginated response shape:**

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0
}
```

---

## Admin dashboard

### Analytics overview

`GET /analytics/dashboard`

**Roles:** `ADMIN`

| Query | Description |
|-------|-------------|
| `period` | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` |
| `from`, `to` | Optional ISO date range override |

**Overview fields** (used on admin home):

- `totalRevenue`, `totalBookings`, `newUsers`, `activeMemberships`, `shopOrders`
- `activeCourts`, `pendingCourts` — court approval counts

### Bookings ledger

`GET /bookings/admin/list`

**Roles:** `ADMIN` · **Permission:** `BOOKINGS_MANAGE`

| `sortBy` | `createdAt`, `totalAmount`, `status` |
| `status` | `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED` |

**Search:** user name, email, court name, city.

### Membership purchases

`GET /memberships/admin/purchases`

**Roles:** `ADMIN` · **Permission:** `MEMBERSHIPS_MANAGE`

| `status` | `ACTIVE`, `EXPIRED`, or omit for all |

**Response includes `stats`:**

```json
{
  "stats": {
    "activeCount": 0,
    "planCount": 0,
    "totalSubscriptions": 0
  }
}
```

### Service listings (admin)

`GET /services/listings/admin/all`

**Roles:** `ADMIN`

Paginated list of all marketplace service listings with provider info and order counts.

### Print orders (admin)

`GET /print/orders/admin/list`

**Roles:** `ADMIN`

Paginated list of all print marketplace orders.

---

## Owner dashboard

### Dashboard stats

`GET /analytics/owner/dashboard`

**Roles:** `COURT_OWNER`, `ADMIN`

Returns owner-scoped metrics:

```json
{
  "stats": {
    "revenueMtd": 0,
    "bookingsToday": 0,
    "bookingsMtd": 0,
    "activeCourts": 0,
    "pendingCourts": 0,
    "activeMembers": 0
  },
  "revenueBreakdown": [{ "source": "Court bookings", "amount": 0, "share": 0 }],
  "monthlyTrend": [{ "month": "Jan", "amount": 0 }],
  "recentBookings": [],
  "courts": [{ "id": "", "name": "", "isApproved": true }]
}
```

### Owner bookings

`GET /bookings/owner/list`

**Roles:** `COURT_OWNER`, `ADMIN` · **Permission:** `BOOKINGS_MANAGE`

Same query parameters and sort fields as the admin bookings list, scoped to courts owned by the authenticated user.

### CSV export

`GET /analytics/owner/export`

**Roles:** `COURT_OWNER`, `ADMIN`

| Query | Description |
|-------|-------------|
| `metric` | `bookings`, `revenue`, or `overview` (default) |
| `period` | Analytics period for the underlying data |

Returns `text/csv` with `Content-Disposition: attachment`.

---

## Trainer dashboard

`GET /training/dashboard/trainer`

**Roles:** `TRAINER`

Returns batch count, active students, attendance stats, and assigned batches. Used by the trainer home page via React Query.

---

## Provider dashboard

`GET /services/dashboard/provider`

**Roles:** `SERVICE_PROVIDER`

Returns listing count, order totals, in-progress/completed counts, and recent orders.

### Provider orders

`GET /services/orders/provider/incoming`

**Roles:** `SERVICE_PROVIDER`

`PATCH /services/orders/:id/status` — update order status (optimistic UI on provider orders page).

---

## Printer dashboard

`GET /print/dashboard`

**Roles:** `PRINTER`

Returns listing count, order totals, awaiting-proof and in-production counts, and recent orders.

### Printer orders

`GET /print/orders/printer/incoming`

**Roles:** `PRINTER`

`PATCH /print/orders/:id/status` — update print order status (optimistic UI on printer orders page).

### Print orders (admin)

See [Print orders (admin)](#print-orders-admin) above.

---

## Frontend data fetching

Dashboard pages use **TanStack React Query** (`@tanstack/react-query`) with:

- Debounced search (300ms)
- Server-side pagination, sorting, and filtering
- `QueryBoundary` for loading and error states with retry
- Optimistic updates on provider/printer order status mutations

**API client modules:**

| App | Module |
|-----|--------|
| Admin | `apps/admin/src/lib/dashboard-api.ts`, `apps/admin/src/lib/analytics.ts` |
| Web (owner) | `apps/web/src/lib/owner-analytics.ts`, `apps/web/src/lib/owner-bookings.ts` |
| Web (trainer) | `apps/web/src/lib/training.ts` |
| Web (provider) | `apps/web/src/lib/marketplace.ts` |
| Web (printer) | `apps/web/src/lib/print.ts` |
| Mobile (player) | `apps/mobile/lib/*.ts` |

---

## Mobile app (Player)

REST endpoints used by the **React Native mobile app** (`apps/mobile`). Configure `EXPO_PUBLIC_API_URL` (see `apps/mobile/.env.example`).

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/otp/send` | Send OTP to phone |
| POST | `/auth/login/phone` | OTP login |
| POST | `/auth/register/otp` | Register with OTP |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |

Tokens are stored in **expo-secure-store**. The mobile client auto-refreshes on `401`.

### Wallet

| Method | Path | Description |
|--------|------|-------------|
| GET | `/wallet` | Balance and recent transactions |
| GET | `/wallet/transactions` | Paginated transaction history |
| POST | `/wallet/topup` | Initiate wallet top-up (returns payment order) |

Top-up completes via `POST /payments/verify` (or `POST /payments/mock-complete` in dev).

### Bookings, memberships, payments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/courts` | List courts (search, sport filter) |
| GET | `/courts/:id` | Court detail |
| GET | `/courts/:id/slots` | Available slots |
| POST | `/bookings` | Create booking + payment order |
| GET | `/bookings/my` | My bookings |
| GET | `/memberships/my` | My memberships |
| POST | `/memberships/purchase` | Purchase plan |
| GET | `/payments/config` | Payment provider config |
| POST | `/payments/mock-complete` | Dev-only payment completion |

### Training, shop, services, print

| Method | Path | Description |
|--------|------|-------------|
| GET | `/training/programs` | List programs |
| GET | `/training/programs/:id` | Program + batches |
| POST | `/training/enroll/new` | Create kid profile + enroll |
| GET | `/shop/products` | Product catalog |
| GET/POST | `/shop/cart` | Cart CRUD |
| POST | `/shop/checkout` | Checkout + payment |
| GET | `/services/listings` | Service marketplace |
| POST | `/services/listings/:id/book` | Book service |
| GET | `/print/listings` | Print listings |
| POST | `/print/designs/upload` | Upload design (base64) |
| POST | `/print/listings/:id/orders` | Place print order |

### Notifications & push

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | Notification history (paginated) |
| GET | `/notifications/unread-count` | Unread badge count |
| GET/PATCH | `/notifications/preferences` | Channel preferences (email, SMS, push, in-app) |
| GET | `/notifications/:id/deliveries` | Per-channel delivery status |
| PATCH | `/notifications/:id/read` | Mark one read |
| POST | `/notifications/read-all` | Mark all read |
| POST | `/notifications/device-tokens` | Register FCM / Expo push token |
| DELETE | `/notifications/device-tokens/:token` | Deactivate token |
| POST | `/notifications/admin/broadcast` | Immediate admin broadcast |
| POST | `/notifications/admin/schedule` | Schedule future broadcast |
| GET | `/notifications/admin/scheduled` | List scheduled broadcasts |
| DELETE | `/notifications/admin/scheduled/:id` | Cancel scheduled broadcast |
| GET | `/notifications/admin/queue-status` | BullMQ queue stats |
| POST | `/notifications/admin/jobs/:jobName` | Manually trigger background job |
| POST | `/notifications/admin/reminders/bookings` | Manual booking reminders |

### Queue admin (BullMQ)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/queue/admin/dashboard` | Full monitoring dashboard (all queues + DLQ) |
| GET | `/queue/admin/dead-letter` | Paginated dead letter jobs |
| POST | `/queue/admin/dead-letter/:id/retry` | Re-enqueue a DLQ job |
| GET | `/queue/admin/jobs` | List scheduled job names + cron patterns |
| POST | `/queue/admin/jobs/:jobName/trigger` | Manually trigger a cron job |

**Queues:** `fitora:email`, `fitora:sms`, `fitora:push`, `fitora:scheduled`, `fitora:refund`, `fitora:payment-retry`, `fitora:dead-letter`

**Background jobs (BullMQ + Redis):**

| Job | Schedule | Description |
|-----|----------|-------------|
| `booking-reminder` | Hourly | ~24h before confirmed bookings |
| `membership-expiring` | Daily 9:00 | 7/3/1 day expiry warnings |
| `membership-expiry` | Daily 9:30 | Deactivate expired memberships |
| `training-reminder` | Daily 8:00 | Next-day training sessions |
| `payment-retry` | Every 15 min | Retry failed payments |
| `daily-reports` | Daily 6:00 | Cache payment reports + daily overview in Redis |
| `analytics-aggregation` | Daily 5:00 | Cache monthly analytics snapshot in Redis |
| `process-scheduled-broadcasts` | Every 5 min | Process due scheduled broadcasts |

**Retry strategy:** Exponential backoff — channel jobs (4 attempts, 2s base), default jobs (5 attempts, 3s base), refund/payment retry (6 attempts, 5s base). Exhausted jobs move to the dead letter queue.

**Inline mode:** When `REDIS_URL` is unset or Redis is unavailable in development, jobs execute synchronously in-process.

**Channels:** in-app (always stored), email (SendGrid), SMS (MSG91), push (FCM + Expo Push API).

**Env vars:** `REDIS_URL`, `EMAIL_MODE`, `SENDGRID_API_KEY`, `SMS_MODE`, `MSG91_*`, `PUSH_MODE`, `FIREBASE_*`

**Mobile client modules:** `apps/mobile/lib/*.ts`

---

## Tenants (multi-tenant SaaS)

`GET /tenants/resolve` — **Public.** Resolve tenant branding by `slug`, `tenantId`, or `domain`.

`GET /tenants/me` — Current tenant for court owner.

`GET /tenants` — **Admin.** List all tenants.

`POST /tenants` — **Admin.** Create tenant.

`PATCH /tenants/:id` — Update tenant (branding, domain).

`PATCH /tenants/:id/payments` — Configure per-tenant Razorpay account.

`GET /tenants/:id/trainers` — List tenant trainers.

Full reference: [MULTI_TENANCY.md](./MULTI_TENANCY.md).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07 | Multi-tenant SaaS: `Tenant` model, row-level `tenant_id` isolation, per-tenant branding/domains/payments, tenants admin API. |
| 2026-07 | Unified BullMQ queue system: email/SMS/push/refund/payment-retry workers, DLQ, daily reports, analytics aggregation, admin monitoring dashboard. |
| 2026-07 | Complete notification system: BullMQ jobs, user preferences, delivery tracking, scheduled broadcasts, FCM+Expo push, membership/training reminders. |
| 2026-07 | Added wallet API, mobile app wired to production endpoints (auth, bookings, memberships, shop, training, services, print, wallet, notifications). Offline cache via React Query + AsyncStorage. |
| 2026-07 | Added admin list endpoints, owner analytics dashboard/export, `activeCourts`/`pendingCourts` on admin analytics overview. Migrated all dashboard UIs from mock data to live APIs with React Query. |
