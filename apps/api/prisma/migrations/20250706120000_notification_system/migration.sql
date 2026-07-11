-- NotificationType enum extensions
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TRAINING_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ADMIN_BROADCAST';

-- Delivery & scheduled enums
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "ScheduledNotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- User notification preferences
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "type_overrides" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-channel delivery tracking
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries"("notification_id");
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");

ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey"
    FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Admin-scheduled broadcasts
CREATE TABLE "scheduled_notifications" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channels" "NotificationChannel"[] DEFAULT ARRAY['IN_APP', 'EMAIL', 'PUSH']::"NotificationChannel"[],
    "created_by_id" UUID NOT NULL,
    "processed_at" TIMESTAMP(3),
    "result_meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scheduled_notifications_scheduled_at_status_idx" ON "scheduled_notifications"("scheduled_at", "status");
CREATE INDEX "scheduled_notifications_created_by_id_idx" ON "scheduled_notifications"("created_by_id");

ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
