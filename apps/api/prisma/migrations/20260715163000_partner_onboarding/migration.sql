-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PartnerApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACTIVATED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_applications" (
    "id" UUID NOT NULL,
    "status" "PartnerApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "current_step" VARCHAR(40) NOT NULL DEFAULT 'business',
    "owner_name" VARCHAR(200),
    "business_name" VARCHAR(200),
    "phone" VARCHAR(20),
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "email" VARCHAR(255),
    "city" VARCHAR(100),
    "venue_address" VARCHAR(500),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "venue" JSONB,
    "sports_config" JSONB,
    "trainers" JSONB,
    "legal" JSONB,
    "visuals" JSONB,
    "user_id" UUID,
    "tenant_id" UUID,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "partner_applications_status_idx" ON "partner_applications"("status");
CREATE INDEX IF NOT EXISTS "partner_applications_email_idx" ON "partner_applications"("email");
CREATE INDEX IF NOT EXISTS "partner_applications_phone_idx" ON "partner_applications"("phone");
CREATE INDEX IF NOT EXISTS "partner_applications_user_id_idx" ON "partner_applications"("user_id");
CREATE INDEX IF NOT EXISTS "partner_applications_tenant_id_idx" ON "partner_applications"("tenant_id");

DO $$ BEGIN
  ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
