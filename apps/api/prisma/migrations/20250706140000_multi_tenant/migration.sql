-- Multi-tenant SaaS: tenants, members, trainers, row-level tenant_id columns

CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

ALTER TYPE "SettingScope" ADD VALUE IF NOT EXISTS 'TENANT';

CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "custom_domain" VARCHAR(255),
    "brand_name" VARCHAR(200),
    "logo_url" VARCHAR(500),
    "favicon_url" VARCHAR(500),
    "primary_color" VARCHAR(20),
    "secondary_color" VARCHAR(20),
    "razorpay_key_id" VARCHAR(100),
    "razorpay_key_secret" VARCHAR(255),
    "razorpay_webhook_secret" VARCHAR(255),
    "use_own_payment_account" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" UUID NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_members" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_trainers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_trainers_pkey" PRIMARY KEY ("id")
);

-- Add tenant_id columns (nullable first for backfill)
ALTER TABLE "courts" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "membership_plans" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "training_programs" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "product_categories" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "products" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "coupons" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "payments" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "service_listings" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "print_listings" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" UUID;

-- Platform tenant for existing global shop catalog
INSERT INTO "tenants" ("id", "name", "slug", "brand_name", "owner_id", "status", "is_active", "updated_at")
SELECT
    gen_random_uuid(),
    'FitOra Platform',
    'platform',
    'FitOra',
    u.id,
    'ACTIVE',
    true,
    CURRENT_TIMESTAMP
FROM "users" u
INNER JOIN "user_roles" ur ON ur.user_id = u.id AND ur.role = 'ADMIN' AND ur.deleted_at IS NULL
LIMIT 1;

-- Fallback platform tenant if no admin exists
INSERT INTO "tenants" ("id", "name", "slug", "brand_name", "owner_id", "status", "is_active", "updated_at")
SELECT gen_random_uuid(), 'FitOra Platform', 'platform', 'FitOra', u.id, 'ACTIVE', true, CURRENT_TIMESTAMP
FROM "users" u
WHERE NOT EXISTS (SELECT 1 FROM "tenants" WHERE slug = 'platform')
ORDER BY u.created_at ASC
LIMIT 1;

-- One tenant per court owner
INSERT INTO "tenants" ("id", "name", "slug", "brand_name", "owner_id", "status", "is_active", "updated_at")
SELECT
    gen_random_uuid(),
    COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email),
    LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(CONCAT(u.first_name, '-', u.last_name)), ''), SPLIT_PART(u.email, '@', 1)), '[^a-z0-9]+', '-', 'g')) || '-' || SUBSTRING(u.id::text, 1, 8),
    COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email),
    u.id,
    'ACTIVE',
    true,
    CURRENT_TIMESTAMP
FROM "users" u
INNER JOIN "user_roles" ur ON ur.user_id = u.id AND ur.role = 'COURT_OWNER' AND ur.deleted_at IS NULL
WHERE NOT EXISTS (SELECT 1 FROM "tenants" t WHERE t.owner_id = u.id AND t.deleted_at IS NULL);

-- Tenant members for owners
INSERT INTO "tenant_members" ("id", "tenant_id", "user_id", "role", "updated_at")
SELECT gen_random_uuid(), t.id, t.owner_id, 'COURT_OWNER', CURRENT_TIMESTAMP
FROM "tenants" t
WHERE t.slug != 'platform'
ON CONFLICT DO NOTHING;

-- Backfill courts
UPDATE "courts" c
SET "tenant_id" = t.id
FROM "tenants" t
WHERE c.owner_id = t.owner_id AND c.tenant_id IS NULL;

-- Backfill membership plans & training programs from court
UPDATE "membership_plans" mp
SET "tenant_id" = c.tenant_id
FROM "courts" c
WHERE mp.court_id = c.id AND mp.tenant_id IS NULL;

UPDATE "training_programs" tp
SET "tenant_id" = c.tenant_id
FROM "courts" c
WHERE tp.court_id = c.id AND tp.tenant_id IS NULL;

-- Backfill shop to platform tenant
UPDATE "product_categories" pc
SET "tenant_id" = (SELECT id FROM "tenants" WHERE slug = 'platform' LIMIT 1)
WHERE pc.tenant_id IS NULL;

UPDATE "products" p
SET "tenant_id" = (SELECT id FROM "tenants" WHERE slug = 'platform' LIMIT 1)
WHERE p.tenant_id IS NULL;

-- Backfill coupons with court
UPDATE "coupons" cp
SET "tenant_id" = c.tenant_id
FROM "courts" c
WHERE cp.court_id = c.id AND cp.tenant_id IS NULL;

-- Drop old unique constraints
ALTER TABLE "courts" DROP CONSTRAINT IF EXISTS "courts_slug_key";
ALTER TABLE "product_categories" DROP CONSTRAINT IF EXISTS "product_categories_name_key";
ALTER TABLE "product_categories" DROP CONSTRAINT IF EXISTS "product_categories_slug_key";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_slug_key";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_sku_key";
ALTER TABLE "coupons" DROP CONSTRAINT IF EXISTS "coupons_code_key";

-- Make tenant_id required where applicable
ALTER TABLE "courts" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "membership_plans" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "training_programs" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "product_categories" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "tenant_id" SET NOT NULL;

-- New unique constraints (tenant-scoped)
CREATE UNIQUE INDEX "courts_tenant_id_slug_key" ON "courts"("tenant_id", "slug");
CREATE UNIQUE INDEX "product_categories_tenant_id_slug_key" ON "product_categories"("tenant_id", "slug");
CREATE UNIQUE INDEX "product_categories_tenant_id_name_key" ON "product_categories"("tenant_id", "name");
CREATE UNIQUE INDEX "products_tenant_id_slug_key" ON "products"("tenant_id", "slug");
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku") WHERE "sku" IS NOT NULL;
CREATE UNIQUE INDEX "coupons_tenant_id_code_key" ON "coupons"("tenant_id", "code");

CREATE UNIQUE INDEX "tenant_members_tenant_id_user_id_role_key" ON "tenant_members"("tenant_id", "user_id", "role");
CREATE UNIQUE INDEX "tenant_trainers_tenant_id_user_id_key" ON "tenant_trainers"("tenant_id", "user_id");
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX "tenants_custom_domain_key" ON "tenants"("custom_domain") WHERE "custom_domain" IS NOT NULL;

-- Foreign keys
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_trainers" ADD CONSTRAINT "tenant_trainers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_trainers" ADD CONSTRAINT "tenant_trainers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "courts" ADD CONSTRAINT "courts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_listings" ADD CONSTRAINT "service_listings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "print_listings" ADD CONSTRAINT "print_listings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "tenants_owner_id_idx" ON "tenants"("owner_id");
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");
CREATE INDEX "tenants_custom_domain_idx" ON "tenants"("custom_domain");
CREATE INDEX "tenants_status_is_active_deleted_at_idx" ON "tenants"("status", "is_active", "deleted_at");
CREATE INDEX "tenant_members_tenant_id_idx" ON "tenant_members"("tenant_id");
CREATE INDEX "tenant_members_user_id_idx" ON "tenant_members"("user_id");
CREATE INDEX "tenant_trainers_tenant_id_idx" ON "tenant_trainers"("tenant_id");
CREATE INDEX "tenant_trainers_user_id_idx" ON "tenant_trainers"("user_id");
CREATE INDEX "courts_tenant_id_idx" ON "courts"("tenant_id");
CREATE INDEX "membership_plans_tenant_id_is_active_idx" ON "membership_plans"("tenant_id", "is_active");
CREATE INDEX "training_programs_tenant_id_is_active_idx" ON "training_programs"("tenant_id", "is_active");
CREATE INDEX "product_categories_tenant_id_is_active_deleted_at_idx" ON "product_categories"("tenant_id", "is_active", "deleted_at");
CREATE INDEX "products_tenant_id_is_active_idx" ON "products"("tenant_id", "is_active");
CREATE INDEX "coupons_tenant_id_code_is_active_idx" ON "coupons"("tenant_id", "code", "is_active");
CREATE INDEX "payments_tenant_id_status_idx" ON "payments"("tenant_id", "status");
CREATE INDEX "service_listings_tenant_id_is_active_idx" ON "service_listings"("tenant_id", "is_active");
CREATE INDEX "print_listings_tenant_id_is_active_idx" ON "print_listings"("tenant_id", "is_active");
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at" DESC);
