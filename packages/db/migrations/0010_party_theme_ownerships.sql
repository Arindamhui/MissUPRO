DO $$ BEGIN
 CREATE TYPE "public"."party_room_type" AS ENUM('PUBLIC', 'PRIVATE', 'VIP', 'MODEL_HOSTED', 'EVENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."party_room_status" AS ENUM('CREATED', 'OPEN', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."seat_status" AS ENUM('EMPTY', 'OCCUPIED', 'LOCKED', 'RESERVED', 'BLOCKED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."seat_layout_type" AS ENUM('CIRCLE', 'GRID', 'STAGE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."party_member_role" AS ENUM('HOST', 'CO_HOST', 'SEATED', 'AUDIENCE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."party_member_status" AS ENUM('ACTIVE', 'LEFT', 'REMOVED', 'KICKED', 'BANNED', 'DISCONNECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."party_theme_status" AS ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."party_activity_type" AS ENUM('DICE_GAME', 'LUCKY_DRAW', 'GIFTING_WAR', 'TRUTH_OR_DARE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."party_activity_status" AS ENUM('CREATED', 'ACTIVE', 'ENDED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."party_activity_result" AS ENUM('WON', 'LOST', 'PARTICIPATING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_name" text NOT NULL,
	"description" text NOT NULL,
	"background_asset_url" text NOT NULL,
	"seat_frame_asset_url" text NOT NULL,
	"ambient_sound_url" text,
	"color_scheme_json" jsonb NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"coin_price" integer,
	"status" "party_theme_status" DEFAULT 'ACTIVE' NOT NULL,
	"season_tag" text,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_themes" ADD CONSTRAINT "party_themes_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_themes_status_idx" ON "party_themes" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_themes_season_status_idx" ON "party_themes" USING btree ("season_tag","status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"room_name" text NOT NULL,
	"description" text,
	"room_type" "party_room_type" DEFAULT 'PUBLIC' NOT NULL,
	"status" "party_room_status" DEFAULT 'CREATED' NOT NULL,
	"password_hash" text,
	"max_seats" integer DEFAULT 8 NOT NULL,
	"max_audience" integer DEFAULT 500 NOT NULL,
	"seat_layout_type" "seat_layout_type" DEFAULT 'CIRCLE' NOT NULL,
	"entry_fee_coins" integer,
	"theme_id" uuid,
	"is_persistent" boolean DEFAULT false NOT NULL,
	"event_id" uuid,
	"total_unique_visitors" integer DEFAULT 0 NOT NULL,
	"peak_occupancy" integer DEFAULT 0 NOT NULL,
	"total_gifts_value_coins" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_rooms" ADD CONSTRAINT "party_rooms_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_rooms" ADD CONSTRAINT "party_rooms_theme_id_party_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."party_themes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_rooms" ADD CONSTRAINT "party_rooms_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_rooms_status_type_idx" ON "party_rooms" USING btree ("status","room_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_rooms_host_status_idx" ON "party_rooms" USING btree ("host_user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_rooms_persistent_status_idx" ON "party_rooms" USING btree ("is_persistent","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_rooms_event_idx" ON "party_rooms" USING btree ("event_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"seat_number" integer NOT NULL,
	"status" "seat_status" DEFAULT 'EMPTY' NOT NULL,
	"occupant_user_id" uuid,
	"reserved_for_user_id" uuid,
	"is_muted" boolean DEFAULT false NOT NULL,
	"is_vip_reserved" boolean DEFAULT false NOT NULL,
	"occupied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_seats" ADD CONSTRAINT "party_seats_room_id_party_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."party_rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_seats" ADD CONSTRAINT "party_seats_occupant_user_id_users_id_fk" FOREIGN KEY ("occupant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_seats" ADD CONSTRAINT "party_seats_reserved_for_user_id_users_id_fk" FOREIGN KEY ("reserved_for_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "party_seats_room_seat_idx" ON "party_seats" USING btree ("room_id","seat_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_seats_room_status_idx" ON "party_seats" USING btree ("room_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_seats_occupant_idx" ON "party_seats" USING btree ("occupant_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "party_member_role" DEFAULT 'AUDIENCE' NOT NULL,
	"status" "party_member_status" DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"total_coins_spent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_members" ADD CONSTRAINT "party_members_room_id_party_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."party_rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_members" ADD CONSTRAINT "party_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_members_room_status_idx" ON "party_members" USING btree ("room_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_members_user_status_idx" ON "party_members" USING btree ("user_id","status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"activity_type" "party_activity_type" NOT NULL,
	"status" "party_activity_status" DEFAULT 'CREATED' NOT NULL,
	"config_json" jsonb NOT NULL,
	"pot_total_coins" integer DEFAULT 0 NOT NULL,
	"platform_fee_coins" integer DEFAULT 0 NOT NULL,
	"winner_user_id" uuid,
	"prize_coins" integer DEFAULT 0 NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_activities" ADD CONSTRAINT "party_activities_room_id_party_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."party_rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_activities" ADD CONSTRAINT "party_activities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_activities_room_status_idx" ON "party_activities" USING btree ("room_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_activities_type_status_idx" ON "party_activities" USING btree ("activity_type","status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_activity_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"coins_contributed" integer DEFAULT 0 NOT NULL,
	"result" "party_activity_result" DEFAULT 'PARTICIPATING' NOT NULL,
	"dice_roll_value" integer,
	"raffle_ticket_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_activity_participants" ADD CONSTRAINT "party_activity_participants_activity_id_party_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."party_activities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_activity_participants" ADD CONSTRAINT "party_activity_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "party_activity_participants_activity_user_idx" ON "party_activity_participants" USING btree ("activity_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_activity_participants_activity_result_idx" ON "party_activity_participants" USING btree ("activity_id","result");
--> statement-breakpoint
INSERT INTO "party_themes" (
	"id",
	"theme_name",
	"description",
	"background_asset_url",
	"seat_frame_asset_url",
	"ambient_sound_url",
	"color_scheme_json",
	"is_premium",
	"coin_price",
	"status",
	"season_tag",
	"created_by_admin_id"
)
SELECT
	gen_random_uuid(),
	seed.theme_name,
	seed.description,
	seed.background_asset_url,
	seed.seat_frame_asset_url,
	seed.ambient_sound_url,
	seed.color_scheme_json::jsonb,
	seed.is_premium,
	seed.coin_price,
	'ACTIVE'::"party_theme_status",
	seed.season_tag,
	admin_user.id
FROM (SELECT id FROM "users" ORDER BY "created_at" ASC LIMIT 1) AS admin_user
CROSS JOIN (
	VALUES
		('Neon Lounge', 'Default social room with a warm neon palette.', '', '', null, '{"primary":"#FF7A59","secondary":"#1F2937","accent":"#FFD166"}', false, null, 'core'),
		('Royal Gold', 'Premium party skin with polished gold highlights.', '', '', null, '{"primary":"#D4AF37","secondary":"#2B2118","accent":"#FFF4BF"}', true, 1200, 'gold'),
		('Midnight Aura', 'Premium dark party skin with electric blue accents.', '', '', null, '{"primary":"#1D4ED8","secondary":"#0F172A","accent":"#67E8F9"}', true, 2400, 'midnight')
) AS seed(theme_name, description, background_asset_url, seat_frame_asset_url, ambient_sound_url, color_scheme_json, is_premium, coin_price, season_tag)
WHERE NOT EXISTS (SELECT 1 FROM "party_themes");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_theme_ownerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme_id" uuid NOT NULL,
	"purchase_price_coins" integer,
	"acquired_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_theme_ownerships" ADD CONSTRAINT "party_theme_ownerships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_theme_ownerships" ADD CONSTRAINT "party_theme_ownerships_theme_id_party_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."party_themes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "party_theme_ownerships_user_theme_idx" ON "party_theme_ownerships" USING btree ("user_id","theme_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_theme_ownerships_user_acquired_idx" ON "party_theme_ownerships" USING btree ("user_id","acquired_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_theme_ownerships_theme_idx" ON "party_theme_ownerships" USING btree ("theme_id");