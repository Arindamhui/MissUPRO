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

  // Create game_players table
  await exec("game_players table", `CREATE TABLE IF NOT EXISTS game_players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES game_sessions(id),
    user_id uuid NOT NULL REFERENCES users(id),
    score integer DEFAULT 0 NOT NULL,
    result text,
    coins_wagered integer DEFAULT 0 NOT NULL,
    coins_won integer DEFAULT 0 NOT NULL,
    joined_at timestamp DEFAULT now() NOT NULL,
    finished_at timestamp
  )`);
  await exec("game_players_session_idx", `CREATE INDEX IF NOT EXISTS game_players_session_idx ON game_players(session_id)`);
  await exec("game_players_user_idx", `CREATE INDEX IF NOT EXISTS game_players_user_idx ON game_players(user_id)`);

  // Check payments column names
  const pCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' ORDER BY ordinal_position`;
  console.log("\npayments columns:", pCols.map(c => c.column_name).join(", "));

  console.log("\nDone!");
}
run().catch(e => console.error("FATAL:", e));
