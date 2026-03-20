DO $$ BEGIN
  CREATE TYPE "public"."auth_role" AS ENUM('admin', 'agency');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_role" "auth_role";--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "user_id" uuid;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "agencies"
    ADD CONSTRAINT "agencies_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_auth_role_idx" ON "users" USING btree ("auth_role");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agencies_user_id_idx" ON "agencies" USING btree ("user_id");--> statement-breakpoint

WITH owner_candidates AS (
  SELECT DISTINCT ON (agency_id)
    agency_id,
    user_id
  FROM "agency_hosts"
  WHERE "status" = 'ACTIVE'
  ORDER BY agency_id, assigned_at ASC
)
UPDATE "agencies" AS a
SET "user_id" = c.user_id
FROM owner_candidates AS c
WHERE a.id = c.agency_id
  AND a.user_id IS NULL;--> statement-breakpoint

UPDATE "users"
SET "auth_role" = 'admin'
WHERE "role" = 'ADMIN'
  AND "auth_role" IS NULL;--> statement-breakpoint

UPDATE "users" AS u
SET "auth_role" = 'agency'
FROM "agencies" AS a
WHERE a.user_id = u.id
  AND u.auth_role IS NULL;--> statement-breakpoint