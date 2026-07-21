-- Real-Time Court Availability Engine: operational state + durable outbox

CREATE TYPE "SlotOperationalState" AS ENUM (
  'AVAILABLE',
  'BLOCKED',
  'MAINTENANCE',
  'TOURNAMENT',
  'PRIVATE',
  'CLOSED'
);

CREATE TYPE "RealtimeOutboxStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'PUBLISHED',
  'FAILED'
);

ALTER TABLE "court_slots"
  ADD COLUMN IF NOT EXISTS "operational_state" "SlotOperationalState" NOT NULL DEFAULT 'AVAILABLE';

-- Backfill from legacy is_blocked / block_reason
UPDATE "court_slots"
SET "operational_state" = CASE
  WHEN "is_blocked" = false THEN 'AVAILABLE'::"SlotOperationalState"
  WHEN "block_reason" = 'MAINTENANCE' THEN 'MAINTENANCE'::"SlotOperationalState"
  WHEN "block_reason" = 'TOURNAMENT' THEN 'TOURNAMENT'::"SlotOperationalState"
  WHEN "block_reason" = 'HOLIDAY' THEN 'CLOSED'::"SlotOperationalState"
  ELSE 'BLOCKED'::"SlotOperationalState"
END
WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "court_slots_operational_state_idx"
  ON "court_slots"("operational_state");

CREATE TABLE IF NOT EXISTS "realtime_outbox" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "event_type" VARCHAR(80) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "RealtimeOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" VARCHAR(1000),
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "realtime_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "realtime_outbox_event_id_key"
  ON "realtime_outbox"("event_id");

CREATE INDEX IF NOT EXISTS "realtime_outbox_status_available_at_idx"
  ON "realtime_outbox"("status", "available_at");

CREATE INDEX IF NOT EXISTS "realtime_outbox_event_type_created_at_idx"
  ON "realtime_outbox"("event_type", "created_at" DESC);
