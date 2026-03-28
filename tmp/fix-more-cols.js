require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function run() {
  async function exec(label, query) {
    try {
      await sql(query);
      console.log("[OK] " + label);
    } catch (e) {
      if (e.message.includes("already exists") || e.message.includes("duplicate")) {
        console.log("[SKIP] " + label);
      } else {
        console.error("[FAIL] " + label + ": " + e.message);
      }
    }
  }

  // homepage_sections missing columns
  await exec("homepage_sections.status", `ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE'`);
  await exec("homepage_sections.scheduled_start", `ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS scheduled_start timestamp`);
  await exec("homepage_sections.scheduled_end", `ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS scheduled_end timestamp`);
  await exec("homepage_sections.created_by_admin_id", `ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS created_by_admin_id uuid`);

  // Make sure we have correct support_tickets columns
  await exec("support_tickets.escalated_at", `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS escalated_at timestamp`);
  await exec("support_tickets.resolution_note", `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution_note text`);
  await exec("support_tickets.metadata_json", `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS metadata_json jsonb`);

  // Check what other tables might be missing columns
  // coin_packages might be missing some expected columns
  const cpCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'coin_packages' ORDER BY ordinal_position`;
  console.log("\ncoin_packages columns:", cpCols.map(c => c.column_name).join(", "));

  // auth_sessions
  const asCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_sessions' ORDER BY ordinal_position`;
  console.log("auth_sessions columns:", asCols.map(c => c.column_name).join(", "));

  console.log("\nDone!");
}
run().catch(e => console.error("FATAL:", e));
