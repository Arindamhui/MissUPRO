DO $$ BEGIN
 CREATE TYPE "public"."group_audio_room_type" AS ENUM('FREE', 'PAID', 'VIP_ONLY', 'INVITE_ONLY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."group_audio_room_status" AS ENUM('SCHEDULED', 'CREATED', 'LIVE', 'ENDING', 'ENDED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."group_audio_participant_role" AS ENUM('HOST', 'CO_HOST', 'SPEAKER', 'LISTENER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."group_audio_participant_status" AS ENUM('ACTIVE', 'LEFT', 'REMOVED', 'DISCONNECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."hand_raise_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_audio_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"topic_tags_json" jsonb,
	"room_type" "group_audio_room_type" DEFAULT 'FREE' NOT NULL,
	"status" "group_audio_room_status" DEFAULT 'CREATED' NOT NULL,
	"max_speakers" integer DEFAULT 8 NOT NULL,
	"max_listeners" integer DEFAULT 200 NOT NULL,
	"coins_per_minute" integer,
	"scheduled_start_at" timestamp,
	"started_at" timestamp,
	"ended_at" timestamp,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"total_participants_count" integer DEFAULT 0 NOT NULL,
	"peak_listener_count" integer DEFAULT 0 NOT NULL,
	"is_recording_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_audio_rooms" ADD CONSTRAINT "group_audio_rooms_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_rooms_status_started_idx" ON "group_audio_rooms" USING btree ("status","started_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_rooms_host_status_idx" ON "group_audio_rooms" USING btree ("host_user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_rooms_type_status_idx" ON "group_audio_rooms" USING btree ("room_type","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_rooms_scheduled_idx" ON "group_audio_rooms" USING btree ("scheduled_start_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_audio_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "group_audio_participant_role" DEFAULT 'LISTENER' NOT NULL,
	"status" "group_audio_participant_status" DEFAULT 'ACTIVE' NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"total_coins_spent" integer DEFAULT 0 NOT NULL,
	"billable_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_audio_participants" ADD CONSTRAINT "group_audio_participants_room_id_group_audio_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."group_audio_rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_audio_participants" ADD CONSTRAINT "group_audio_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_participants_room_status_idx" ON "group_audio_participants" USING btree ("room_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_participants_user_status_idx" ON "group_audio_participants" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_participants_room_role_idx" ON "group_audio_participants" USING btree ("room_id","role");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_audio_billing_ticks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tick_number" integer NOT NULL,
	"coins_deducted" integer NOT NULL,
	"user_balance_after" integer NOT NULL,
	"tick_timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_audio_billing_ticks" ADD CONSTRAINT "group_audio_billing_ticks_room_id_group_audio_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."group_audio_rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_audio_billing_ticks" ADD CONSTRAINT "group_audio_billing_ticks_participant_id_group_audio_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."group_audio_participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_audio_billing_ticks" ADD CONSTRAINT "group_audio_billing_ticks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_audio_billing_room_participant_tick_idx" ON "group_audio_billing_ticks" USING btree ("room_id","participant_id","tick_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_billing_user_timestamp_idx" ON "group_audio_billing_ticks" USING btree ("user_id","tick_timestamp");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_audio_hand_raises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "hand_raise_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_audio_hand_raises" ADD CONSTRAINT "group_audio_hand_raises_room_id_group_audio_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."group_audio_rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_audio_hand_raises" ADD CONSTRAINT "group_audio_hand_raises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_audio_hand_raises" ADD CONSTRAINT "group_audio_hand_raises_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_hand_raises_room_status_idx" ON "group_audio_hand_raises" USING btree ("room_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_audio_hand_raises_user_room_idx" ON "group_audio_hand_raises" USING btree ("user_id","room_id");