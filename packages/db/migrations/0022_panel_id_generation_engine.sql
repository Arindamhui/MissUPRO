-- ═══════════════════════════════════════════════════════════════════════
-- Migration 0022: Panel-Based ID Generation Engine
-- ═══════════════════════════════════════════════════════════════════════
-- Adds public_admin_id column to admins table, adds CHECK constraints
-- for strict panel ID formats, and adds DB-level enforcement.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Add public_admin_id column to admins (AD + 8 digits)
ALTER TABLE IF EXISTS "admins"
  ADD COLUMN IF NOT EXISTS "public_admin_id" text;--> statement-breakpoint

-- 2. Create unique index on public_admin_id
CREATE UNIQUE INDEX IF NOT EXISTS "admins_public_admin_id_idx"
  ON "admins" ("public_admin_id");--> statement-breakpoint

-- 3. Add CHECK constraints for strict ID format enforcement
-- USER: U + 9 digits
ALTER TABLE IF EXISTS "users"
  DROP CONSTRAINT IF EXISTS "chk_users_public_user_id_format";--> statement-breakpoint
ALTER TABLE IF EXISTS "users"
  ADD CONSTRAINT "chk_users_public_user_id_format"
  CHECK ("public_user_id" IS NULL OR "public_user_id" ~ '^U[0-9]{9}$');--> statement-breakpoint

ALTER TABLE IF EXISTS "users"
  DROP CONSTRAINT IF EXISTS "chk_users_public_id_format";--> statement-breakpoint
ALTER TABLE IF EXISTS "users"
  ADD CONSTRAINT "chk_users_public_id_format"
  CHECK ("public_id" IS NULL OR "public_id" ~ '^U[0-9]{9}$');--> statement-breakpoint

-- ADMIN: AD + 8 digits
ALTER TABLE IF EXISTS "admins"
  DROP CONSTRAINT IF EXISTS "chk_admins_public_admin_id_format";--> statement-breakpoint
ALTER TABLE IF EXISTS "admins"
  ADD CONSTRAINT "chk_admins_public_admin_id_format"
  CHECK ("public_admin_id" IS NULL OR "public_admin_id" ~ '^AD[0-9]{8}$');--> statement-breakpoint

-- AGENCY: A + 9 digits
ALTER TABLE IF EXISTS "agencies"
  DROP CONSTRAINT IF EXISTS "chk_agencies_public_id_format";--> statement-breakpoint
ALTER TABLE IF EXISTS "agencies"
  ADD CONSTRAINT "chk_agencies_public_id_format"
  CHECK ("public_id" IS NULL OR "public_id" ~ '^A[0-9]{9}$');--> statement-breakpoint

ALTER TABLE IF EXISTS "agencies"
  DROP CONSTRAINT IF EXISTS "chk_agencies_agency_code_format";--> statement-breakpoint
ALTER TABLE IF EXISTS "agencies"
  ADD CONSTRAINT "chk_agencies_agency_code_format"
  CHECK ("agency_code" IS NULL OR "agency_code" ~ '^A[0-9]{9}$');--> statement-breakpoint

-- HOST: H + 9 digits or AH + 8 digits
ALTER TABLE IF EXISTS "hosts"
  DROP CONSTRAINT IF EXISTS "chk_hosts_host_id_format";--> statement-breakpoint
ALTER TABLE IF EXISTS "hosts"
  ADD CONSTRAINT "chk_hosts_host_id_format"
  CHECK ("host_id" ~ '^(H[0-9]{9}|AH[0-9]{8})$');--> statement-breakpoint

ALTER TABLE IF EXISTS "hosts"
  DROP CONSTRAINT IF EXISTS "chk_hosts_public_id_format";--> statement-breakpoint
ALTER TABLE IF EXISTS "hosts"
  ADD CONSTRAINT "chk_hosts_public_id_format"
  CHECK ("public_id" IS NULL OR "public_id" ~ '^(H[0-9]{9}|AH[0-9]{8})$');--> statement-breakpoint
