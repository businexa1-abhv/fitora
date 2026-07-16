-- P3.5 Booking Engine: waitlist, recurring bookings, tournament closure reason

ALTER TYPE "ClosureReason" ADD VALUE IF NOT EXISTS 'TOURNAMENT';

CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'CONVERTED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "RecurringBookingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

CREATE TABLE "slot_waitlist_entries" (
    "id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "offered_until" TIMESTAMP(3),
    "position" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recurring_bookings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "slot_schedule_id" UUID,
    "day_of_week" INTEGER,
    "start_hour" INTEGER,
    "start_minute" INTEGER NOT NULL DEFAULT 0,
    "end_hour" INTEGER,
    "end_minute" INTEGER NOT NULL DEFAULT 0,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "RecurringBookingStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "slot_waitlist_active_unique"
  ON "slot_waitlist_entries"("slot_id", "user_id")
  WHERE "status" IN ('WAITING', 'OFFERED') AND "deleted_at" IS NULL;

CREATE INDEX "slot_waitlist_entries_slot_id_status_position_idx"
  ON "slot_waitlist_entries"("slot_id", "status", "position");
CREATE INDEX "slot_waitlist_entries_user_id_status_idx"
  ON "slot_waitlist_entries"("user_id", "status");
CREATE INDEX "slot_waitlist_entries_court_id_idx"
  ON "slot_waitlist_entries"("court_id");
CREATE INDEX "slot_waitlist_entries_offered_until_idx"
  ON "slot_waitlist_entries"("offered_until");
CREATE INDEX "slot_waitlist_entries_deleted_at_idx"
  ON "slot_waitlist_entries"("deleted_at");

CREATE INDEX "recurring_bookings_user_id_status_idx"
  ON "recurring_bookings"("user_id", "status");
CREATE INDEX "recurring_bookings_court_id_status_idx"
  ON "recurring_bookings"("court_id", "status");
CREATE INDEX "recurring_bookings_slot_schedule_id_idx"
  ON "recurring_bookings"("slot_schedule_id");
CREATE INDEX "recurring_bookings_deleted_at_idx"
  ON "recurring_bookings"("deleted_at");

ALTER TABLE "slot_waitlist_entries"
  ADD CONSTRAINT "slot_waitlist_entries_slot_id_fkey"
  FOREIGN KEY ("slot_id") REFERENCES "court_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slot_waitlist_entries"
  ADD CONSTRAINT "slot_waitlist_entries_court_id_fkey"
  FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slot_waitlist_entries"
  ADD CONSTRAINT "slot_waitlist_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_bookings"
  ADD CONSTRAINT "recurring_bookings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_bookings"
  ADD CONSTRAINT "recurring_bookings_court_id_fkey"
  FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_bookings"
  ADD CONSTRAINT "recurring_bookings_slot_schedule_id_fkey"
  FOREIGN KEY ("slot_schedule_id") REFERENCES "slot_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
