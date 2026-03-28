const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");
async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS model_stats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      model_user_id uuid NOT NULL,
      current_level integer DEFAULT 1,
      total_diamonds integer DEFAULT 0,
      total_video_minutes integer DEFAULT 0,
      total_audio_minutes integer DEFAULT 0,
      total_calls_completed integer DEFAULT 0,
      total_gifts_received integer DEFAULT 0,
      level_updated_at timestamptz,
      level_override integer,
      level_override_reason text,
      level_override_by_admin_id uuid,
      price_override_video integer,
      price_override_audio integer,
      price_override_reason text,
      price_override_by_admin_id uuid,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `);
  console.log("[OK] model_stats table created");
  
  try {
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS model_stats_model_idx ON model_stats(model_user_id)`);
    console.log("[OK] model_stats_model_idx");
  } catch(e) { console.log("[INFO]", e.message); }

  process.exit(0);
}
main();
