-- Real-time slot availability engine Phase 1
-- Multi-capacity CourtSlot + multi-booking per slot

CREATE TYPE "SlotBookingMode" AS ENUM ('EXCLUSIVE', 'SHARED');
CREATE TYPE "BookingSource" AS ENUM ('PLAYER_APP', 'OWNER_WALK_IN', 'OWNER_MANUAL', 'ADMIN');

ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "default_slot_capacity" INTEGER;

ALTER TABLE "court_slots"
  ADD COLUMN IF NOT EXISTS "capacity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "reserved_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "confirmed_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "booking_mode" "SlotBookingMode" NOT NULL DEFAULT 'EXCLUSIVE',
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "seats" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "source" "BookingSource" NOT NULL DEFAULT 'PLAYER_APP',
  ADD COLUMN IF NOT EXISTS "hold_token" UUID,
  ADD COLUMN IF NOT EXISTS "guest_name" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "guest_phone" VARCHAR(20);

-- Drop 1:1 unique constraint so multiple bookings can share a slot
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_slot_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_hold_token_key" ON "bookings"("hold_token");
CREATE INDEX IF NOT EXISTS "bookings_slot_id_idx" ON "bookings"("slot_id");
CREATE INDEX IF NOT EXISTS "bookings_slot_id_status_payment_status_idx" ON "bookings"("slot_id", "status", "payment_status");
CREATE INDEX IF NOT EXISTS "bookings_slot_id_locked_until_idx" ON "bookings"("slot_id", "locked_until");

-- Backfill counters from existing bookings
UPDATE "court_slots" cs SET
  "capacity" = 1,
  "booking_mode" = 'EXCLUSIVE',
  "confirmed_count" = COALESCE((
    SELECT COUNT(*)::int FROM "bookings" b
    WHERE b."slot_id" = cs."id"
      AND b."deleted_at" IS NULL
      AND b."status" IN ('CONFIRMED', 'COMPLETED')
      AND b."payment_status" = 'PAID'
  ), 0),
  "reserved_count" = COALESCE((
    SELECT COUNT(*)::int FROM "bookings" b
    WHERE b."slot_id" = cs."id"
      AND b."deleted_at" IS NULL
      AND b."status" = 'PENDING'
      AND b."payment_status" = 'PENDING'
      AND (b."locked_until" IS NULL OR b."locked_until" > NOW())
  ), 0);

-- Assign hold tokens to existing PENDING bookings
UPDATE "bookings"
SET "hold_token" = gen_random_uuid()
WHERE "status" = 'PENDING'
  AND "payment_status" = 'PENDING'
  AND "hold_token" IS NULL
  AND "deleted_at" IS NULL;

-- Capacity guard (after backfill)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'court_slots_capacity_check'
  ) THEN
    ALTER TABLE "court_slots"
      ADD CONSTRAINT "court_slots_capacity_check"
      CHECK ("reserved_count" + "confirmed_count" <= "capacity");
  END IF;
END $$;
