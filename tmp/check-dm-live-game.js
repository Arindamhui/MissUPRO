// Check actual columns of dm_conversations, live_streams, and game_players
const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");

async function main() {
  for (const table of ["dm_conversations", "live_streams", "game_players", "game_sessions"]) {
    try {
      const result = await db.execute(sql`
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = ${table}
        order by ordinal_position
      `);
      const cols = result.rows.map(r => r.column_name);
      console.log(`\n${table}: ${cols.join(", ")}`);
    } catch (e) {
      console.log(`\n${table}: ERROR - ${e.message}`);
    }
  }
  process.exit(0);
}
main();
