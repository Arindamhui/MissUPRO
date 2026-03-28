const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");
async function main() {
  const r = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='withdraw_requests'
    ORDER BY ordinal_position
  `);
  console.log("withdraw_requests columns:", r.rows.map(x => x.column_name).join(", "));

  // Add all missing columns to match schema
  const cols = [
    ["audio_minutes_snapshot", "integer DEFAULT 0 NOT NULL"],
    ["video_minutes_snapshot", "integer DEFAULT 0 NOT NULL"],
    ["audio_rate_snapshot", "numeric(10,4) DEFAULT 0 NOT NULL"],
    ["video_rate_snapshot", "numeric(10,4) DEFAULT 0 NOT NULL"],
    ["call_earnings_snapshot", "numeric(12,2) DEFAULT 0 NOT NULL"],
    ["diamond_balance_snapshot", "integer DEFAULT 0 NOT NULL"],
    ["diamond_earnings_snapshot", "numeric(12,2) DEFAULT 0 NOT NULL"],
    ["total_payout_amount", "numeric(12,2) DEFAULT 0 NOT NULL"],
    ["currency", "text DEFAULT 'USD' NOT NULL"],
    ["payout_method", "text DEFAULT 'BANK_TRANSFER' NOT NULL"],
    ["payout_details_json", "jsonb DEFAULT '{}'::jsonb NOT NULL"],
    ["rejection_reason", "text"],
    ["approved_by_admin_id", "uuid"],
    ["approved_at", "timestamptz"],
    ["completed_at", "timestamptz"],
    ["fraud_risk_score", "integer DEFAULT 0 NOT NULL"],
    ["updated_at", "timestamptz DEFAULT now() NOT NULL"],
  ];

  for (const [col, type] of cols) {
    try {
      await db.execute(sql.raw(`ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS ${col} ${type}`));
    } catch(e) { console.log(`ERR ${col}:`, e.message); }
  }
  console.log("All columns added");

  const r2 = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='withdraw_requests'
    ORDER BY ordinal_position
  `);
  console.log("Updated columns:", r2.rows.map(x => x.column_name).join(", "));

  process.exit(0);
}
main();
