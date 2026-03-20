DO $$ BEGIN
  CREATE TYPE "public"."platform_role" AS ENUM('USER', 'MODEL_INDEPENDENT', 'MODEL_AGENCY', 'AGENCY', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION', 'DELETED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."auth_provider" AS ENUM('EMAIL', 'GOOGLE', 'FACEBOOK', 'PHONE_OTP', 'WHATSAPP_OTP', 'CUSTOM_OTP', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."access_record_status" AS ENUM('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."model_profile_type" AS ENUM('INDEPENDENT', 'AGENCY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "user_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'GLOBAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" "gender";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_active_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "platform_role" "platform_role" DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" "auth_provider" DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_metadata_json" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_data_json" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "models" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "clerk_id" text,
  "agency_id" uuid,
  "model_type" "model_profile_type" DEFAULT 'INDEPENDENT' NOT NULL,
  "registration_status" "access_record_status" DEFAULT 'ACTIVE' NOT NULL,
  "auth_provider" "auth_provider" DEFAULT 'UNKNOWN' NOT NULL,
  "metadata_json" jsonb,
  "talent_categories_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "talent_description" text DEFAULT '' NOT NULL,
  "languages_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "about_text" text,
  "demo_video_count" integer DEFAULT 0 NOT NULL,
  "call_rate_audio_coins" integer DEFAULT 0 NOT NULL,
  "call_rate_video_coins" integer DEFAULT 0 NOT NULL,
  "is_online" boolean DEFAULT false NOT NULL,
  "last_online_at" timestamp,
  "total_followers" integer DEFAULT 0 NOT NULL,
  "total_streams" integer DEFAULT 0 NOT NULL,
  "total_call_minutes" integer DEFAULT 0 NOT NULL,
  "response_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
  "quality_score" numeric(5, 2) DEFAULT '0' NOT NULL,
  "approved_at" timestamp,
  "approved_by_admin_id" uuid,
  "deleted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "models"
    ADD CONSTRAINT "models_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "clerk_id" text;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "agency_id" uuid;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "model_type" "model_profile_type" DEFAULT 'INDEPENDENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "registration_status" "access_record_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "auth_provider" "auth_provider" DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "metadata_json" jsonb;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "models"
    ADD CONSTRAINT "models_agency_id_agencies_id_fk"
    FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "clerk_id" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "agency_code" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "approval_status" "agency_application_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "metadata_json" jsonb;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "rejected_at" timestamp;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint

ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "clerk_id" text;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid,
  "actor_platform_role" text,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "tenant_agency_id" uuid,
  "before_state_json" jsonb,
  "after_state_json" jsonb,
  "metadata_json" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_tenant_agency_id_agencies_id_fk"
    FOREIGN KEY ("tenant_agency_id") REFERENCES "public"."agencies"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

UPDATE "users"
SET "clerk_id" = coalesce("clerk_id", "clerk_user_id")
WHERE "clerk_id" IS NULL
  AND "clerk_user_id" IS NOT NULL;--> statement-breakpoint

UPDATE "users"
SET "email_verified" = coalesce("email_verified", false) OR "email_verified_at" IS NOT NULL,
    "last_active_at" = coalesce("last_active_at", "updated_at", "created_at"),
    "referral_code" = coalesce("referral_code", upper(substr(md5("id"::text), 1, 12)))
WHERE "email_verified" IS DISTINCT FROM (coalesce("email_verified", false) OR "email_verified_at" IS NOT NULL)
   OR "last_active_at" IS NULL
   OR "referral_code" IS NULL;--> statement-breakpoint

UPDATE "users"
SET "status" = CASE
      WHEN coalesce("is_banned", false) THEN 'BANNED'::"user_status"
      WHEN coalesce("is_suspended", false) THEN 'SUSPENDED'::"user_status"
      ELSE 'ACTIVE'::"user_status"
    END,
    "is_verified" = coalesce("is_verified", false) OR coalesce("email_verified", false)
WHERE "status" IS DISTINCT FROM CASE
      WHEN coalesce("is_banned", false) THEN 'BANNED'::"user_status"
      WHEN coalesce("is_suspended", false) THEN 'SUSPENDED'::"user_status"
      ELSE 'ACTIVE'::"user_status"
    END
   OR "is_verified" IS DISTINCT FROM (coalesce("is_verified", false) OR coalesce("email_verified", false));--> statement-breakpoint

UPDATE "users" AS u
SET "display_name" = coalesce(nullif(p."display_name", ''), nullif(u."display_name", ''), initcap(replace(u."username", '_', ' ')), split_part(u."email", '@', 1)),
    "avatar_url" = coalesce(u."avatar_url", p."avatar_url"),
    "country" = coalesce(nullif(u."country", ''), nullif(p."country", ''), 'GLOBAL'),
    "city" = coalesce(u."city", p."city")
FROM "profiles" AS p
WHERE p."user_id" = u."id"
  AND (
    u."display_name" IS NULL
    OR u."display_name" = ''
    OR u."avatar_url" IS NULL
    OR u."country" IS NULL
    OR u."country" = ''
    OR u."city" IS NULL
  );--> statement-breakpoint

UPDATE "users"
SET "display_name" = coalesce(nullif("display_name", ''), initcap(replace("username", '_', ' ')), split_part("email", '@', 1)),
    "country" = coalesce(nullif("country", ''), 'GLOBAL')
WHERE "display_name" IS NULL
   OR "display_name" = ''
   OR "country" IS NULL
   OR "country" = '';--> statement-breakpoint

UPDATE "users"
SET "platform_role" = CASE
  WHEN "role" = 'ADMIN' THEN 'ADMIN'::"platform_role"
  WHEN "auth_role" = 'agency' THEN 'AGENCY'::"platform_role"
  WHEN "role" = 'HOST' THEN 'MODEL_AGENCY'::"platform_role"
  WHEN "role" = 'MODEL' THEN 'MODEL_INDEPENDENT'::"platform_role"
  ELSE 'USER'::"platform_role"
END
WHERE "platform_role" IS DISTINCT FROM CASE
  WHEN "role" = 'ADMIN' THEN 'ADMIN'::"platform_role"
  WHEN "auth_role" = 'agency' THEN 'AGENCY'::"platform_role"
  WHEN "role" = 'HOST' THEN 'MODEL_AGENCY'::"platform_role"
  WHEN "role" = 'MODEL' THEN 'MODEL_INDEPENDENT'::"platform_role"
  ELSE 'USER'::"platform_role"
END;--> statement-breakpoint

UPDATE "users"
SET "auth_provider" = CASE
  WHEN "clerk_id" IS NOT NULL THEN 'EMAIL'::"auth_provider"
  ELSE 'UNKNOWN'::"auth_provider"
END
WHERE "auth_provider" = 'UNKNOWN';--> statement-breakpoint

UPDATE "models"
SET "agency_id" = ah."agency_id",
    "model_type" = CASE WHEN ah."agency_id" IS NULL THEN 'INDEPENDENT'::"model_profile_type" ELSE 'AGENCY'::"model_profile_type" END,
    "registration_status" = CASE WHEN ah."agency_id" IS NULL THEN 'ACTIVE'::"access_record_status" ELSE 'ACTIVE'::"access_record_status" END
FROM (
  SELECT DISTINCT ON ("user_id") "user_id", "agency_id"
  FROM "agency_hosts"
  WHERE "status" = 'ACTIVE'
  ORDER BY "user_id", "assigned_at" DESC
) AS ah
WHERE "models"."user_id" = ah."user_id";--> statement-breakpoint

UPDATE "agencies"
SET "approval_status" = CASE
  WHEN upper(coalesce("status"::text, 'PENDING')) = 'ACTIVE' THEN 'APPROVED'::"agency_application_status"
  WHEN upper(coalesce("status"::text, 'PENDING')) = 'REJECTED' THEN 'REJECTED'::"agency_application_status"
  ELSE 'PENDING'::"agency_application_status"
END,
"updated_at" = coalesce("updated_at", now());--> statement-breakpoint

WITH numbered_agencies AS (
  SELECT
    id,
    lower(regexp_replace(coalesce(agency_name, 'agency'), '[^a-zA-Z0-9]+', '-', 'g')) AS slug_base,
    substr(md5(id::text), 1, 6) AS short_hash
  FROM "agencies"
)
UPDATE "agencies" AS a
SET "agency_code" = trim(both '-' from concat(na.slug_base, '-', na.short_hash))
FROM numbered_agencies AS na
WHERE a.id = na.id
  AND (a."agency_code" IS NULL OR a."agency_code" = '');--> statement-breakpoint

UPDATE "admins" AS a
SET "email" = lower(u."email"),
    "clerk_id" = u."clerk_id"
FROM "users" AS u
WHERE a."user_id" = u."id"
  AND (a."email" IS NULL OR a."clerk_id" IS NULL);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "users_platform_role_idx" ON "users" USING btree ("platform_role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_auth_provider_idx" ON "users" USING btree ("auth_provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_referral_code_idx" ON "users" USING btree ("referral_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "models_user_id_idx" ON "models" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "models_clerk_id_idx" ON "models" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "models_agency_id_idx" ON "models" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "models_type_status_idx" ON "models" USING btree ("model_type", "registration_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "models_online_quality_idx" ON "models" USING btree ("is_online", "quality_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "models_deleted_at_idx" ON "models" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agencies_clerk_id_idx" ON "agencies" USING btree ("clerk_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agencies_code_idx" ON "agencies" USING btree ("agency_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agencies_approval_status_idx" ON "agencies" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agencies_deleted_at_idx" ON "agencies" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admins_email_idx" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admins_clerk_id_idx" ON "admins" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_created_idx" ON "audit_logs" USING btree ("entity_type", "entity_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_created_idx" ON "audit_logs" USING btree ("tenant_agency_id", "created_at");--> statement-breakpoint