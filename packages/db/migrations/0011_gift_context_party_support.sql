DO $$ BEGIN
 ALTER TYPE "public"."gift_context_type" ADD VALUE IF NOT EXISTS 'PK_BATTLE';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."gift_context_type" ADD VALUE IF NOT EXISTS 'GROUP_AUDIO';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."gift_context_type" ADD VALUE IF NOT EXISTS 'PARTY';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;