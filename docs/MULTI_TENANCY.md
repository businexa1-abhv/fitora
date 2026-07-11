# Multi-Tenancy (FitOra SaaS)

FitOra is a **multi-tenant SaaS platform**. Each court owner operates as an isolated **tenant** with their own branding, domain, payment account, memberships, trainers, products, and reports.

## Concepts

| Concept | Description |
|---------|-------------|
| **Tenant** | Organization owned by a court owner (or created by platform admin) |
| **Platform admin** | `ADMIN` role — manages all tenants, bypasses tenant isolation when needed |
| **Row-level isolation** | `tenant_id` on courts, products, memberships, training, payments, etc. |
| **Tenant context** | Resolved per HTTP request from subdomain, custom domain, or headers |

## Tenant resolution

The API resolves the active tenant on every request (via `TenantMiddleware`):

1. **`X-Tenant-Id`** header (UUID)
2. **`X-Tenant-Slug`** header (e.g. `smash-arena`)
3. **Custom domain** — `Host` matches `tenants.custom_domain`
4. **Subdomain** — `{slug}.fitora.com` (excludes `www`, `api`, `admin`)

When no tenant context is set:

- **Public shop** defaults to the `platform` tenant catalog
- **Platform admin** endpoints operate across all tenants
- **Court owner** endpoints scope by `ownerId` when tenant header is omitted

## Per-tenant capabilities

Each tenant can configure:

- **Branding** — `brandName`, `logoUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`
- **Domain** — `slug` (subdomain) and optional `customDomain`
- **Payments** — own Razorpay keys (`useOwnPaymentAccount`, `razorpayKeyId`, etc.) or platform keys
- **Memberships** — plans scoped to tenant courts
- **Trainers** — `tenant_trainers` join table
- **Products** — tenant-scoped shop catalog
- **Reports** — owner analytics filtered by `tenantId`

## API endpoints

Base path: `/api/v1/tenants`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/resolve?slug=` | Public | Branding for web/mobile bootstrap |
| `GET` | `/me` | Court owner / Admin | Current user's tenant |
| `GET` | `/` | Admin | List all tenants |
| `GET` | `/:id` | Owner / Admin | Tenant details |
| `POST` | `/` | Admin | Create tenant |
| `PATCH` | `/:id` | Owner / Admin | Update tenant |
| `PATCH` | `/:id/branding` | Owner / Admin | Branding only |
| `PATCH` | `/:id/payments` | Owner / Admin | Razorpay credentials |
| `PATCH` | `/:id/status` | Admin | Activate / suspend tenant |
| `GET` | `/:id/trainers` | Owner / Admin | List tenant trainers |
| `POST` | `/:id/trainers` | Owner / Admin | Add trainer |
| `DELETE` | `/:id/trainers/:userId` | Owner / Admin | Remove trainer |

### Headers

```http
X-Tenant-Id: <uuid>
# or
X-Tenant-Slug: smash-arena
```

## Permissions

| Permission | Roles |
|------------|-------|
| `tenants:read` | Admin, Court Owner |
| `tenants:write` | Admin, Court Owner |
| `tenants:manage` | Admin |

## Database schema

New models:

- `tenants` — organization, branding, payment config
- `tenant_members` — user ↔ tenant role assignments
- `tenant_trainers` — trainers linked to a tenant

`tenant_id` added to:

- `courts`, `membership_plans`, `training_programs`
- `product_categories`, `products`
- `coupons`, `payments`, `service_listings`, `print_listings`, `audit_logs`

Unique constraints are **tenant-scoped** (e.g. `@@unique([tenantId, slug])` on courts and products).

## Registration flow

When a user registers as `COURT_OWNER`, the API automatically creates a tenant and `tenant_members` record.

## Deployment

Set in production:

```env
PLATFORM_BASE_DOMAIN=fitora.com
```

Configure NGINX / DNS:

- `*.fitora.com` → web app (tenant subdomains)
- `courts.example.com` → custom domain CNAME to platform

## Migration

Run:

```bash
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed
```

The migration backfills one tenant per existing court owner and assigns existing shop data to the `platform` tenant.
