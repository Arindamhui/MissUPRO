const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");
async function main() {
  await db.execute(sql`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS viewer_count_current integer DEFAULT 0`);
  console.log("[OK] live_streams.viewer_count_current");
  await db.execute(sql`ALTER TABLE game_players ADD COLUMN IF NOT EXISTS role_or_seat text`);
  console.log("[OK] game_players.role_or_seat");
  process.exit(0);
}
main();
