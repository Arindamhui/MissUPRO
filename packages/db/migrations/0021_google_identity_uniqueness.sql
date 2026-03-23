ALTER TABLE IF EXISTS "users"
  ADD COLUMN IF NOT EXISTS "google_id" text;--> statement-breakpoint

UPDATE "users"
SET "google_id" = "auth_metadata_json" ->> 'googleSub'
WHERE "google_id" IS NULL
  AND "auth_metadata_json" IS NOT NULL
  AND ("auth_metadata_json" ->> 'googleSub') IS NOT NULL
  AND ("auth_metadata_json" ->> 'googleSub') <> '';--> statement-breakpoint

DO $$
DECLARE
  duplicate_google_id text;
BEGIN
  SELECT google_id
  INTO duplicate_google_id
  FROM "users"
  WHERE "google_id" IS NOT NULL
  GROUP BY "google_id"
  HAVING count(*) > 1
  LIMIT 1;

  IF duplicate_google_id IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate users.google_id detected during auth hardening migration: %', duplicate_google_id;
  END IF;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_idx" ON "users" ("google_id");--> statement-breakpoint