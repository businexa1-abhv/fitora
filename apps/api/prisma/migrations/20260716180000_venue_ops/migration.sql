-- AlterTable
-- Venue ops: expenses, slot types, staff shifts, payroll, player CRM

CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI');
CREATE TYPE "StaffShiftRole" AS ENUM ('FRONT_DESK', 'COACH', 'MAINTENANCE');
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "PayrollLineStatus" AS ENUM ('PENDING', 'PAID');

CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "court_id" UUID,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "payment_method" "ExpensePaymentMethod",
    "receipt_url" VARCHAR(500),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "slot_type_configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "multiplier" DECIMAL(6,2) NOT NULL,
    "color" VARCHAR(40) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_type_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_shifts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "staff_user_id" UUID,
    "staff_name" VARCHAR(200) NOT NULL,
    "role" "StaffShiftRole" NOT NULL,
    "date" DATE NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "area" VARCHAR(200) NOT NULL,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_shifts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_lines" (
    "id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "rate_per_session" DECIMAL(12,2) NOT NULL,
    "commission" DECIMAL(12,2) NOT NULL,
    "status" "PayrollLineStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_notes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "player_user_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "content" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_crm_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "medical_notes" TEXT,
    "skill_level" VARCHAR(100),
    "skill_notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_crm_profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expenses_tenant_id_date_idx" ON "expenses"("tenant_id", "date" DESC);
CREATE INDEX "expenses_tenant_id_category_idx" ON "expenses"("tenant_id", "category");
CREATE INDEX "expenses_deleted_at_idx" ON "expenses"("deleted_at");

CREATE UNIQUE INDEX "slot_type_configs_tenant_id_name_key" ON "slot_type_configs"("tenant_id", "name");
CREATE INDEX "slot_type_configs_tenant_id_is_active_deleted_at_idx" ON "slot_type_configs"("tenant_id", "is_active", "deleted_at");

CREATE INDEX "staff_shifts_tenant_id_date_idx" ON "staff_shifts"("tenant_id", "date");
CREATE INDEX "staff_shifts_staff_user_id_idx" ON "staff_shifts"("staff_user_id");
CREATE INDEX "staff_shifts_deleted_at_idx" ON "staff_shifts"("deleted_at");

CREATE INDEX "payroll_periods_tenant_id_start_date_end_date_idx" ON "payroll_periods"("tenant_id", "start_date", "end_date");
CREATE INDEX "payroll_periods_deleted_at_idx" ON "payroll_periods"("deleted_at");

CREATE UNIQUE INDEX "payroll_lines_period_id_trainer_id_key" ON "payroll_lines"("period_id", "trainer_id");
CREATE INDEX "payroll_lines_trainer_id_idx" ON "payroll_lines"("trainer_id");
CREATE INDEX "payroll_lines_status_idx" ON "payroll_lines"("status");

CREATE INDEX "player_notes_tenant_id_player_user_id_deleted_at_idx" ON "player_notes"("tenant_id", "player_user_id", "deleted_at");
CREATE INDEX "player_notes_author_id_idx" ON "player_notes"("author_id");

CREATE UNIQUE INDEX "player_crm_profiles_tenant_id_user_id_key" ON "player_crm_profiles"("tenant_id", "user_id");
CREATE INDEX "player_crm_profiles_deleted_at_idx" ON "player_crm_profiles"("deleted_at");

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "slot_type_configs" ADD CONSTRAINT "slot_type_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "player_notes" ADD CONSTRAINT "player_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_notes" ADD CONSTRAINT "player_notes_player_user_id_fkey" FOREIGN KEY ("player_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_notes" ADD CONSTRAINT "player_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "player_crm_profiles" ADD CONSTRAINT "player_crm_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_crm_profiles" ADD CONSTRAINT "player_crm_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
