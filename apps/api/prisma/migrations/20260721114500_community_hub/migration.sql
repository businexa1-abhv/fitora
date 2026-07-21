-- Community Hub: groups, chat, matches, friends, moderation

-- CreateEnum
CREATE TYPE "CommunityGroupType" AS ENUM ('BADMINTON', 'CRICKET', 'FOOTBALL', 'PICKLEBALL', 'TENNIS', 'VOLLEYBALL', 'BASKETBALL', 'TABLE_TENNIS', 'RUNNING_CLUB', 'CYCLING_CLUB', 'FITNESS_GROUP', 'CORPORATE', 'PRIVATE', 'PUBLIC', 'ACADEMY_BATCH');

-- CreateEnum
CREATE TYPE "CommunityPrivacy" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "CommunitySkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "CommunityPlayingWindow" AS ENUM ('MORNING', 'EVENING', 'WEEKEND');

-- CreateEnum
CREATE TYPE "CommunityMemberRole" AS ENUM ('OWNER', 'ADMIN', 'CO_ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "CommunityMemberStatus" AS ENUM ('ACTIVE', 'PENDING', 'REJECTED', 'WAITLISTED', 'MUTED', 'BANNED', 'LEFT');

-- CreateEnum
CREATE TYPE "CommunityJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunityMatchType" AS ENUM ('FRIENDLY', 'PRACTICE', 'TOURNAMENT', 'TRAINING', 'OPEN_MATCH');

-- CreateEnum
CREATE TYPE "CommunityMatchStatus" AS ENUM ('WAITING_PLAYERS', 'CONFIRMED', 'FULL', 'CANCELLED', 'COMPLETED', 'LIVE');

-- CreateEnum
CREATE TYPE "CommunityRsvpStatus" AS ENUM ('COMING', 'MAYBE', 'NOT_COMING', 'LATE', 'NEED_PICKUP', 'NEED_PARTNER', 'BRING_SHUTTLE', 'BRING_BALL', 'NEED_RACQUET');

-- CreateEnum
CREATE TYPE "CommunityMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'VOICE', 'DOCUMENT', 'GIF', 'STICKER', 'SYSTEM', 'ANNOUNCEMENT', 'POLL', 'MATCH_CARD');

-- CreateEnum
CREATE TYPE "CommunityAnnouncementType" AS ENUM ('PRACTICE_CANCELLED', 'COURT_CHANGED', 'TOURNAMENT', 'HOLIDAY', 'MEMBERSHIP_RENEWAL', 'TRAINING', 'FEES_DUE', 'MAINTENANCE', 'WEATHER_ALERT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CommunityFriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CommunityReportTarget" AS ENUM ('USER', 'MESSAGE', 'GROUP', 'MATCH');

-- CreateEnum
CREATE TYPE "CommunityReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CommunityAttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'CHECKED_IN');

-- CreateEnum
CREATE TYPE "CommunityFeedItemType" AS ENUM ('MATCH', 'PHOTO', 'ACHIEVEMENT', 'TOURNAMENT_WINNER', 'PLAYER_OF_WEEK', 'NEW_GROUP', 'COACH_POST', 'OWNER_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "CommunityPollStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_JOIN_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_JOIN_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_JOIN_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_NEW_MATCH';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_MATCH_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_MENTION';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_REACTION';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_ANNOUNCEMENT';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_VENUE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_COURT_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_PLAYER_NEEDED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_FRIEND_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_MATCH_STARTED';

-- CreateTable
CREATE TABLE "community_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "owner_id" UUID NOT NULL,
    "sport_id" UUID,
    "home_court_id" UUID,
    "training_batch_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "rules" TEXT,
    "cover_photo_url" VARCHAR(500),
    "emoji" VARCHAR(16),
    "group_type" "CommunityGroupType" NOT NULL,
    "privacy" "CommunityPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "skill_level" "CommunitySkillLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "max_players" INTEGER NOT NULL DEFAULT 20,
    "location_label" VARCHAR(200),
    "city" VARCHAR(100),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "playing_days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "playing_windows" "CommunityPlayingWindow"[] DEFAULT ARRAY[]::"CommunityPlayingWindow"[],
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "member_count" INTEGER NOT NULL DEFAULT 1,
    "is_trending" BOOLEAN NOT NULL DEFAULT false,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_group_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CommunityMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "CommunityMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "muted_until" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_join_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" VARCHAR(500),
    "status" "CommunityJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "court_id" UUID,
    "booking_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "venue_label" VARCHAR(200),
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "required_players" INTEGER NOT NULL DEFAULT 4,
    "confirmed_count" INTEGER NOT NULL DEFAULT 0,
    "skill_level" "CommunitySkillLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "entry_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shuttle_included" BOOLEAN NOT NULL DEFAULT false,
    "ball_included" BOOLEAN NOT NULL DEFAULT false,
    "match_type" "CommunityMatchType" NOT NULL DEFAULT 'FRIENDLY',
    "status" "CommunityMatchStatus" NOT NULL DEFAULT 'WAITING_PLAYERS',
    "needs_players" BOOLEAN NOT NULL DEFAULT true,
    "score_home" INTEGER,
    "score_away" INTEGER,
    "winner_label" VARCHAR(120),
    "live_started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" VARCHAR(500),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_match_players" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rsvp" "CommunityRsvpStatus" NOT NULL DEFAULT 'COMING',
    "note" VARCHAR(300),
    "is_host" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_match_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_match_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "offset_minutes" INTEGER NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_match_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_match_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "CommunityAttendanceStatus" NOT NULL DEFAULT 'CHECKED_IN',
    "check_in_method" VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    "qr_payload" VARCHAR(120),
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_match_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "type" "CommunityMessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "media_url" VARCHAR(500),
    "media_mime_type" VARCHAR(100),
    "reply_to_id" UUID,
    "mention_user_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_message_reactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_message_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),

    CONSTRAINT "community_message_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_pinned_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "pinned_by_id" UUID NOT NULL,
    "pinned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_pinned_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "type" "CommunityAnnouncementType" NOT NULL DEFAULT 'CUSTOM',
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_polls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "message_id" UUID,
    "question" VARCHAR(300) NOT NULL,
    "status" "CommunityPollStatus" NOT NULL DEFAULT 'OPEN',
    "closes_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_poll_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "poll_id" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_poll_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "poll_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "match_id" UUID,
    "uploaded_by_id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'IMAGE',
    "caption" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_friendships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requester_id" UUID NOT NULL,
    "addressee_id" UUID NOT NULL,
    "status" "CommunityFriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "reason" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "group_id" UUID,
    "target_type" "CommunityReportTarget" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "CommunityReportStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_feed_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID,
    "author_id" UUID,
    "type" "CommunityFeedItemType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "image_url" VARCHAR(500),
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_feed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID,
    "user_id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(300),
    "icon_emoji" VARCHAR(16),
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_leaderboard_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "matches_played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "participation_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_groups_training_batch_id_key" ON "community_groups"("training_batch_id");

-- CreateIndex
CREATE INDEX "community_groups_owner_id_idx" ON "community_groups"("owner_id");

-- CreateIndex
CREATE INDEX "community_groups_tenant_id_deleted_at_idx" ON "community_groups"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "community_groups_sport_id_city_deleted_at_idx" ON "community_groups"("sport_id", "city", "deleted_at");

-- CreateIndex
CREATE INDEX "community_groups_group_type_privacy_deleted_at_idx" ON "community_groups"("group_type", "privacy", "deleted_at");

-- CreateIndex
CREATE INDEX "community_groups_is_trending_last_activity_at_idx" ON "community_groups"("is_trending", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "community_groups_city_last_activity_at_idx" ON "community_groups"("city", "last_activity_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_groups_slug_key" ON "community_groups"("slug");

-- CreateIndex
CREATE INDEX "community_group_members_user_id_status_idx" ON "community_group_members"("user_id", "status");

-- CreateIndex
CREATE INDEX "community_group_members_group_id_role_status_idx" ON "community_group_members"("group_id", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_group_members_group_id_user_id_key" ON "community_group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "community_join_requests_group_id_status_created_at_idx" ON "community_join_requests"("group_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_join_requests_user_id_status_idx" ON "community_join_requests"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_join_requests_group_id_user_id_key" ON "community_join_requests"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_matches_booking_id_key" ON "community_matches"("booking_id");

-- CreateIndex
CREATE INDEX "community_matches_group_id_starts_at_idx" ON "community_matches"("group_id", "starts_at");

-- CreateIndex
CREATE INDEX "community_matches_status_starts_at_idx" ON "community_matches"("status", "starts_at");

-- CreateIndex
CREATE INDEX "community_matches_needs_players_starts_at_idx" ON "community_matches"("needs_players", "starts_at");

-- CreateIndex
CREATE INDEX "community_matches_court_id_starts_at_idx" ON "community_matches"("court_id", "starts_at");

-- CreateIndex
CREATE INDEX "community_matches_created_by_id_idx" ON "community_matches"("created_by_id");

-- CreateIndex
CREATE INDEX "community_match_players_user_id_rsvp_idx" ON "community_match_players"("user_id", "rsvp");

-- CreateIndex
CREATE INDEX "community_match_players_match_id_rsvp_idx" ON "community_match_players"("match_id", "rsvp");

-- CreateIndex
CREATE UNIQUE INDEX "community_match_players_match_id_user_id_key" ON "community_match_players"("match_id", "user_id");

-- CreateIndex
CREATE INDEX "community_match_reminders_scheduled_for_sent_at_idx" ON "community_match_reminders"("scheduled_for", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "community_match_reminders_match_id_offset_minutes_key" ON "community_match_reminders"("match_id", "offset_minutes");

-- CreateIndex
CREATE INDEX "community_match_attendance_user_id_checked_in_at_idx" ON "community_match_attendance"("user_id", "checked_in_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_match_attendance_match_id_user_id_key" ON "community_match_attendance"("match_id", "user_id");

-- CreateIndex
CREATE INDEX "community_messages_group_id_created_at_idx" ON "community_messages"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_messages_author_id_created_at_idx" ON "community_messages"("author_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_messages_reply_to_id_idx" ON "community_messages"("reply_to_id");

-- CreateIndex
CREATE INDEX "community_message_reactions_message_id_idx" ON "community_message_reactions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_message_reactions_message_id_user_id_emoji_key" ON "community_message_reactions"("message_id", "user_id", "emoji");

-- CreateIndex
CREATE INDEX "community_message_receipts_user_id_read_at_idx" ON "community_message_receipts"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "community_message_receipts_message_id_user_id_key" ON "community_message_receipts"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "community_pinned_messages_group_id_pinned_at_idx" ON "community_pinned_messages"("group_id", "pinned_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_pinned_messages_group_id_message_id_key" ON "community_pinned_messages"("group_id", "message_id");

-- CreateIndex
CREATE INDEX "community_announcements_group_id_created_at_idx" ON "community_announcements"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_announcements_author_id_idx" ON "community_announcements"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_polls_message_id_key" ON "community_polls"("message_id");

-- CreateIndex
CREATE INDEX "community_polls_group_id_status_idx" ON "community_polls"("group_id", "status");

-- CreateIndex
CREATE INDEX "community_poll_options_poll_id_sort_order_idx" ON "community_poll_options"("poll_id", "sort_order");

-- CreateIndex
CREATE INDEX "community_poll_votes_option_id_idx" ON "community_poll_votes"("option_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_poll_votes_poll_id_user_id_key" ON "community_poll_votes"("poll_id", "user_id");

-- CreateIndex
CREATE INDEX "community_media_group_id_created_at_idx" ON "community_media"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_media_match_id_idx" ON "community_media"("match_id");

-- CreateIndex
CREATE INDEX "community_friendships_addressee_id_status_idx" ON "community_friendships"("addressee_id", "status");

-- CreateIndex
CREATE INDEX "community_friendships_requester_id_status_idx" ON "community_friendships"("requester_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_friendships_requester_id_addressee_id_key" ON "community_friendships"("requester_id", "addressee_id");

-- CreateIndex
CREATE INDEX "community_blocks_blocked_id_idx" ON "community_blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_blocks_blocker_id_blocked_id_key" ON "community_blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "community_reports_status_created_at_idx" ON "community_reports"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_reports_target_type_target_id_idx" ON "community_reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "community_feed_items_created_at_idx" ON "community_feed_items"("created_at" DESC);

-- CreateIndex
CREATE INDEX "community_feed_items_group_id_created_at_idx" ON "community_feed_items"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_feed_items_type_created_at_idx" ON "community_feed_items"("type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_achievements_user_id_awarded_at_idx" ON "community_achievements"("user_id", "awarded_at" DESC);

-- CreateIndex
CREATE INDEX "community_achievements_group_id_awarded_at_idx" ON "community_achievements"("group_id", "awarded_at" DESC);

-- CreateIndex
CREATE INDEX "community_leaderboard_entries_group_id_points_idx" ON "community_leaderboard_entries"("group_id", "points" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_leaderboard_entries_group_id_user_id_key" ON "community_leaderboard_entries"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "community_groups" ADD CONSTRAINT "community_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_groups" ADD CONSTRAINT "community_groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_groups" ADD CONSTRAINT "community_groups_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_groups" ADD CONSTRAINT "community_groups_home_court_id_fkey" FOREIGN KEY ("home_court_id") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_groups" ADD CONSTRAINT "community_groups_training_batch_id_fkey" FOREIGN KEY ("training_batch_id") REFERENCES "training_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_group_members" ADD CONSTRAINT "community_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_group_members" ADD CONSTRAINT "community_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_join_requests" ADD CONSTRAINT "community_join_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_join_requests" ADD CONSTRAINT "community_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_join_requests" ADD CONSTRAINT "community_join_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_matches" ADD CONSTRAINT "community_matches_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_matches" ADD CONSTRAINT "community_matches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_matches" ADD CONSTRAINT "community_matches_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_matches" ADD CONSTRAINT "community_matches_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_match_players" ADD CONSTRAINT "community_match_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "community_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_match_players" ADD CONSTRAINT "community_match_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_match_reminders" ADD CONSTRAINT "community_match_reminders_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "community_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_match_attendance" ADD CONSTRAINT "community_match_attendance_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "community_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_match_attendance" ADD CONSTRAINT "community_match_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "community_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_message_reactions" ADD CONSTRAINT "community_message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "community_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_message_reactions" ADD CONSTRAINT "community_message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_message_receipts" ADD CONSTRAINT "community_message_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "community_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_pinned_messages" ADD CONSTRAINT "community_pinned_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_pinned_messages" ADD CONSTRAINT "community_pinned_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "community_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_announcements" ADD CONSTRAINT "community_announcements_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_announcements" ADD CONSTRAINT "community_announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_polls" ADD CONSTRAINT "community_polls_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_options" ADD CONSTRAINT "community_poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "community_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "community_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "community_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_media" ADD CONSTRAINT "community_media_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_media" ADD CONSTRAINT "community_media_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "community_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_friendships" ADD CONSTRAINT "community_friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_friendships" ADD CONSTRAINT "community_friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_blocks" ADD CONSTRAINT "community_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_blocks" ADD CONSTRAINT "community_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_feed_items" ADD CONSTRAINT "community_feed_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_feed_items" ADD CONSTRAINT "community_feed_items_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_achievements" ADD CONSTRAINT "community_achievements_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_achievements" ADD CONSTRAINT "community_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_leaderboard_entries" ADD CONSTRAINT "community_leaderboard_entries_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

