DO $$ BEGIN
  CREATE TYPE "public"."pk_result_type" AS ENUM('WIN', 'DRAW', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "pk_sessions" ADD COLUMN IF NOT EXISTS "battle_duration_seconds" integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE "pk_sessions" ADD COLUMN IF NOT EXISTS "host_a_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pk_sessions" ADD COLUMN IF NOT EXISTS "host_b_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pk_sessions" ADD COLUMN IF NOT EXISTS "result_type" "pk_result_type";--> statement-breakpoint
ALTER TABLE "pk_sessions" ADD COLUMN IF NOT EXISTS "created_by_admin_id" uuid;--> statement-breakpoint

UPDATE "pk_sessions"
SET "battle_duration_seconds" = coalesce("battle_duration_seconds", "duration_seconds", 300)
WHERE "battle_duration_seconds" IS NULL;--> statement-breakpoint