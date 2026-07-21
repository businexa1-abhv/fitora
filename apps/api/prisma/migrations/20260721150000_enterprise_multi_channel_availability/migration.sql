-- Enterprise multi-channel availability engine.
-- HELD and BOOKED remain derived from booking rows and slot counters.

ALTER TYPE "BookingSource" ADD VALUE IF NOT EXISTS 'PLAYO';
ALTER TYPE "BookingSource" ADD VALUE IF NOT EXISTS 'PLAYARENA';
ALTER TYPE "BookingSource" ADD VALUE IF NOT EXISTS 'EXTERNAL_CHANNEL';

CREATE TYPE "IntegrationProvider" AS ENUM ('PLAYO', 'PLAYARENA', 'GENERIC');
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISCONNECTED', 'ERROR');
CREATE TYPE "IntegrationDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "IntegrationSyncJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'DEAD_LETTER');
CREATE TYPE "IntegrationConflictType" AS ENUM ('DUPLICATE_BOOKING', 'CAPACITY_MISMATCH', 'SLOT_MAPPING_MISSING', 'EXTERNAL_STATE_MISMATCH', 'WEBHOOK_REJECTED');
CREATE TYPE "IntegrationConflictStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');
CREATE TYPE "SlotLifecycleStatus" AS ENUM ('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED', 'MAINTENANCE', 'TOURNAMENT', 'OWNER_RESERVED');

CREATE TABLE "integration_connections" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "api_key_hash" VARCHAR(64) NOT NULL,
    "credentials_encrypted" TEXT,
    "webhook_secret_encrypted" TEXT NOT NULL,
    "outbound_endpoint" VARCHAR(1000),
    "config" JSONB,
    "last_sync_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "failed_webhook_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integration_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "integration_connections_api_key_hash_key" ON "integration_connections"("api_key_hash");
CREATE UNIQUE INDEX "integration_connections_tenant_id_provider_key" ON "integration_connections"("tenant_id", "provider");
CREATE INDEX "integration_connections_tenant_id_status_idx" ON "integration_connections"("tenant_id", "status");

CREATE TABLE "slot_channel_mappings" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "external_slot_id" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "slot_channel_mappings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slot_channel_mappings_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slot_channel_mappings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "court_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "slot_channel_mappings_integration_id_slot_id_key" ON "slot_channel_mappings"("integration_id", "slot_id");
CREATE UNIQUE INDEX "slot_channel_mappings_integration_id_external_slot_id_key" ON "slot_channel_mappings"("integration_id", "external_slot_id");
CREATE INDEX "slot_channel_mappings_slot_id_is_active_idx" ON "slot_channel_mappings"("slot_id", "is_active");

CREATE TABLE "integration_sync_jobs" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "slot_id" UUID,
    "booking_id" UUID,
    "direction" "IntegrationDirection" NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "status" "IntegrationSyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 8,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "latency_ms" INTEGER,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integration_sync_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integration_sync_jobs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "integration_sync_jobs_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "court_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "integration_sync_jobs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "integration_sync_jobs_idempotency_key_key" ON "integration_sync_jobs"("idempotency_key");
CREATE INDEX "integration_sync_jobs_status_next_attempt_at_idx" ON "integration_sync_jobs"("status", "next_attempt_at");
CREATE INDEX "integration_sync_jobs_integration_id_created_at_idx" ON "integration_sync_jobs"("integration_id", "created_at" DESC);
CREATE INDEX "integration_sync_jobs_slot_id_idx" ON "integration_sync_jobs"("slot_id");

CREATE TABLE "slot_lifecycle_audits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "booking_id" UUID,
    "integration_id" UUID,
    "direction" "IntegrationDirection",
    "from_status" "SlotLifecycleStatus",
    "to_status" "SlotLifecycleStatus" NOT NULL,
    "actor_id" UUID,
    "reason" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slot_lifecycle_audits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slot_lifecycle_audits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slot_lifecycle_audits_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "court_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slot_lifecycle_audits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "slot_lifecycle_audits_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "slot_lifecycle_audits_slot_id_created_at_idx" ON "slot_lifecycle_audits"("slot_id", "created_at" DESC);
CREATE INDEX "slot_lifecycle_audits_tenant_id_created_at_idx" ON "slot_lifecycle_audits"("tenant_id", "created_at" DESC);
CREATE INDEX "slot_lifecycle_audits_booking_id_idx" ON "slot_lifecycle_audits"("booking_id");

CREATE TABLE "integration_conflicts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "slot_id" UUID,
    "booking_id" UUID,
    "external_ref" VARCHAR(255),
    "type" "IntegrationConflictType" NOT NULL,
    "status" "IntegrationConflictStatus" NOT NULL DEFAULT 'OPEN',
    "details" JSONB NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integration_conflicts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integration_conflicts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "integration_conflicts_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "integration_conflicts_tenant_id_status_created_at_idx" ON "integration_conflicts"("tenant_id", "status", "created_at" DESC);
CREATE INDEX "integration_conflicts_integration_id_status_idx" ON "integration_conflicts"("integration_id", "status");
CREATE INDEX "integration_conflicts_external_ref_idx" ON "integration_conflicts"("external_ref");

CREATE TABLE "integration_webhook_events" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "external_event_id" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integration_webhook_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integration_webhook_events_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "integration_webhook_events_integration_id_external_event_id_key" ON "integration_webhook_events"("integration_id", "external_event_id");
CREATE INDEX "integration_webhook_events_provider_created_at_idx" ON "integration_webhook_events"("provider", "created_at" DESC);

ALTER TABLE "bookings"
    ADD COLUMN "integration_id" UUID,
    ADD COLUMN "external_booking_id" VARCHAR(255),
    ADD COLUMN "external_idempotency_key" VARCHAR(255);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "bookings_integration_id_external_booking_id_key" ON "bookings"("integration_id", "external_booking_id");
CREATE UNIQUE INDEX "bookings_integration_id_external_idempotency_key_key" ON "bookings"("integration_id", "external_idempotency_key");
CREATE INDEX "bookings_integration_id_idx" ON "bookings"("integration_id");
