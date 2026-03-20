DO $$ BEGIN
 CREATE TYPE "public"."host_type" AS ENUM('PLATFORM', 'AGENCY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."host_lifecycle_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."host_application_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_user_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_public_user_id_idx" ON "users" USING btree ("public_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "host_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agency_id" uuid,
	"application_type" "host_type" NOT NULL,
	"status" "host_application_status" DEFAULT 'PENDING' NOT NULL,
	"agency_code_snapshot" text,
	"talent_details_json" jsonb NOT NULL,
	"profile_info_json" jsonb NOT NULL,
	"id_proof_urls_json" jsonb NOT NULL,
	"review_notes" text,
	"reviewed_by_admin_user_id" uuid,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "host_applications" ADD CONSTRAINT "host_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "host_applications" ADD CONSTRAINT "host_applications_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "host_applications" ADD CONSTRAINT "host_applications_reviewed_by_admin_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "host_applications_status_submitted_idx" ON "host_applications" USING btree ("status","submitted_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "host_applications_user_status_idx" ON "host_applications" USING btree ("user_id","status","submitted_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "host_applications_agency_status_idx" ON "host_applications" USING btree ("agency_id","status","submitted_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"agency_id" uuid,
	"type" "host_type" NOT NULL,
	"status" "host_lifecycle_status" DEFAULT 'PENDING' NOT NULL,
	"talent_details_json" jsonb,
	"profile_info_json" jsonb,
	"id_proof_urls_json" jsonb,
	"source_application_id" uuid,
	"review_notes" text,
	"reviewed_by_admin_user_id" uuid,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hosts" ADD CONSTRAINT "hosts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hosts" ADD CONSTRAINT "hosts_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hosts" ADD CONSTRAINT "hosts_source_application_id_host_applications_id_fk" FOREIGN KEY ("source_application_id") REFERENCES "public"."host_applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hosts" ADD CONSTRAINT "hosts_reviewed_by_admin_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hosts_host_id_idx" ON "hosts" USING btree ("host_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hosts_user_id_idx" ON "hosts" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hosts_agency_status_idx" ON "hosts" USING btree ("agency_id","status","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hosts_type_status_idx" ON "hosts" USING btree ("type","status","created_at");