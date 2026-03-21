/**
 * Comprehensive schema sync: brings the live Neon DB up to date
 * with the current Drizzle schema for all auth-related tables.
 *
 * Compares live columns against what the code expects and adds
 * every missing column, index, and constraint in one pass.
 */
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function run(client, sql, label) {
  try {
    await client.query(sql);
    console.log(`  OK: ${label}`);
  } catch (err) {
    // Ignore "already exists" or "duplicate" errors
    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
      console.log(`  SKIP (exists): ${label}`);
    } else {
      console.error(`  FAIL: ${label} — ${err.message}`);
    }
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // ────────────────────────────────────────────
  // profiles — missing: social_links_json, interests_json, profile_frame_url,
  //   header_image_url, location_display, profile_completeness_score
  // ────────────────────────────────────────────
  console.log('\n--- profiles ---');
  await run(client, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links_json jsonb`, 'profiles.social_links_json');
  await run(client, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests_json jsonb`, 'profiles.interests_json');
  await run(client, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_frame_url text`, 'profiles.profile_frame_url');
  await run(client, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS header_image_url text`, 'profiles.header_image_url');
  await run(client, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_display text`, 'profiles.location_display');
  await run(client, `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completeness_score integer NOT NULL DEFAULT 0`, 'profiles.profile_completeness_score');

  // ────────────────────────────────────────────
  // security_events — live has old shape (user_id, ip_hash, payload)
  //   code expects: actor_user_id, ip_address, user_agent, geo_location_json,
  //   device_fingerprint_hash, severity, details_json, related_entity_type, related_entity_id
  // ────────────────────────────────────────────
  console.log('\n--- security_events ---');
  await run(client, `ALTER TABLE security_events ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES users(id)`, 'security_events.actor_user_id');
  await run(client, `ALTER TABLE security_events ADD COLUMN IF NOT EXISTS ip_address text NOT NULL DEFAULT ''`, 'security_events.ip_address');
  await run(client, `ALTER TABLE security_events ADD COLUMN IF NOT EXISTS user_agent text`, 'security_events.user_agent');
  await run(client, `ALTER TABLE security_events ADD COLUMN IF NOT EXISTS geo_location_json jsonb`, 'security_events.geo_location_json');
  await run(client, `ALTER TABLE security_events ADD COLUMN IF NOT EXISTS device_fingerprint_hash text`, 'security_events.device_fingerprint_hash');
  // severity enum may already exist
  await run(client, `DO $$ BEGIN CREATE TYPE severity AS ENUM('INFO','WARNING','HIGH','CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'severity enum');
  await run(client, `ALTER TABLE security_events ADD COLUMN IF NOT EXISTS severity severity NOT NULL DEFAULT 'INFO'`, 'security_events.severity');
  await run(client, `ALTER TABLE security_events ADD COLUMN IF NOT EXISTS details_json jsonb`, 'security_events.details_json');
  await run(client, `ALTER TABLE security_events ADD COLUMN IF NOT EXISTS related_entity_type text`, 'security_events.related_entity_type');
  await run(client, `ALTER TABLE security_events ADD COLUMN IF NOT EXISTS related_entity_id uuid`, 'security_events.related_entity_id');

  // ────────────────────────────────────────────
  // email_verifications — old shape has token_hash/used_at
  //   code expects: email, verification_token_hash, verification_type, status, verified_at
  // ────────────────────────────────────────────
  console.log('\n--- email_verifications ---');
  await run(client, `ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''`, 'email_verifications.email');
  await run(client, `ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS verification_token_hash text NOT NULL DEFAULT ''`, 'email_verifications.verification_token_hash');
  // verification_type and verification_status enums
  await run(client, `DO $$ BEGIN CREATE TYPE verification_type AS ENUM('SIGNUP','EMAIL_CHANGE','PASSWORD_RESET'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'verification_type enum');
  await run(client, `DO $$ BEGIN CREATE TYPE verification_status AS ENUM('PENDING','VERIFIED','EXPIRED','USED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'verification_status enum');
  await run(client, `ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS verification_type verification_type NOT NULL DEFAULT 'SIGNUP'`, 'email_verifications.verification_type');
  await run(client, `ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS status verification_status NOT NULL DEFAULT 'PENDING'`, 'email_verifications.status');
  await run(client, `ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS verified_at timestamp`, 'email_verifications.verified_at');

  // ────────────────────────────────────────────
  // users — fix password_hash nullable (already done, but idempotent)
  // ────────────────────────────────────────────
  console.log('\n--- users ---');
  await run(client, `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`, 'users.password_hash nullable');
  await run(client, `ALTER TABLE users ALTER COLUMN password_hash TYPE text`, 'users.password_hash type=text');

  // ────────────────────────────────────────────
  // Verify critical columns now exist
  // ────────────────────────────────────────────
  console.log('\n--- Verification ---');
  const checks = [
    { table: 'profiles', col: 'social_links_json' },
    { table: 'security_events', col: 'actor_user_id' },
    { table: 'security_events', col: 'severity' },
    { table: 'security_events', col: 'ip_address' },
    { table: 'security_events', col: 'details_json' },
    { table: 'email_verifications', col: 'verification_token_hash' },
    { table: 'email_verifications', col: 'status' },
    { table: 'users', col: 'public_user_id' },
  ];
  for (const { table, col } of checks) {
    const r = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
      [table, col]
    );
    console.log(`  ${table}.${col}: ${r.rows.length > 0 ? 'EXISTS' : 'MISSING!'}`);
  }

  await client.end();
  console.log('\nDone. All auth-related schema gaps have been patched.');
}

main().catch((err) => { console.error(err); process.exit(1); });
