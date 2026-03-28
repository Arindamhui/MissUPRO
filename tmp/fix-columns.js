// Fix column mismatches between DB and schema/service code
require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const errors = [];
  async function exec(label, query) {
    try {
      await sql(query);
      console.log("[OK] " + label);
    } catch (e) {
      if (e.message.includes("already exists") || e.message.includes("duplicate")) {
        console.log("[SKIP] " + label + " (already exists)");
      } else {
        console.error("[FAIL] " + label + ": " + e.message);
        errors.push(label + ": " + e.message);
      }
    }
  }

  console.log("--- Fixing coin_transactions ---");
  // Add transaction_type column with data from reason
  await exec("coin_tx.transaction_type", `ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS transaction_type text`);
  await exec("coin_tx.description", `ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS description text`);
  await exec("coin_tx.idempotency_key", `ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS idempotency_key text`);
  await exec("coin_tx.reference_type", `ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS reference_type text`);
  // Backfill transaction_type from reason
  await exec("coin_tx backfill", `UPDATE coin_transactions SET transaction_type = COALESCE(reason, 'ADMIN_ADJUSTMENT') WHERE transaction_type IS NULL`);

  console.log("\n--- Fixing diamond_transactions ---");
  await exec("diamond_tx.transaction_type", `ALTER TABLE diamond_transactions ADD COLUMN IF NOT EXISTS transaction_type text`);
  await exec("diamond_tx.description", `ALTER TABLE diamond_transactions ADD COLUMN IF NOT EXISTS description text`);
  await exec("diamond_tx.idempotency_key", `ALTER TABLE diamond_transactions ADD COLUMN IF NOT EXISTS idempotency_key text`);
  await exec("diamond_tx.reference_type", `ALTER TABLE diamond_transactions ADD COLUMN IF NOT EXISTS reference_type text`);
  await exec("diamond_tx backfill", `UPDATE diamond_transactions SET transaction_type = COALESCE(reason, 'ADMIN_ADJUSTMENT') WHERE transaction_type IS NULL`);

  console.log("\n--- Fixing homepage_sections ---");
  await exec("homepage.position", `ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS position integer DEFAULT 0`);
  // Backfill from sort_order
  await exec("homepage.position backfill", `UPDATE homepage_sections SET position = COALESCE(sort_order, 0) WHERE position = 0 OR position IS NULL`);

  console.log("\n--- Fixing wallets check constraints ---");
  // The wallets table was enhanced with new columns but might be missing CHECK constraints
  // These are safe because we already set defaults of 0
  await exec("wallets coin_balance check", `DO $$ BEGIN
    ALTER TABLE wallets ADD CONSTRAINT wallets_coin_balance_check CHECK (coin_balance >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await exec("wallets diamond_balance check", `DO $$ BEGIN
    ALTER TABLE wallets ADD CONSTRAINT wallets_diamond_balance_check CHECK (diamond_balance >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  // Add indexes that might be missing on new columns
  console.log("\n--- Adding useful indexes ---");
  await exec("coin_tx_type_idx", `CREATE INDEX IF NOT EXISTS coin_tx_type_created_idx ON coin_transactions(transaction_type, created_at)`);
  await exec("diamond_tx_type_idx", `CREATE INDEX IF NOT EXISTS diamond_tx_type_created_idx ON diamond_transactions(transaction_type, created_at)`);

  console.log("\n=== DONE ===");
  if (errors.length) {
    console.log("Errors:", errors.join("; "));
  } else {
    console.log("All fixes applied successfully!");
  }
}
run().catch(e => console.error("FATAL:", e));
