const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");
async function main() {
  const fixes = [];

  // live_streams — match full Drizzle schema from live.ts
  const liveStreamCols = [
    ["stream_title", "text"],
    ["rtc_channel_id", "text DEFAULT ''"],
    ["viewer_count_peak", "integer DEFAULT 0"],
    ["gift_revenue_coins", "integer DEFAULT 0"],
    ["end_reason", "text"],
    ["duration_seconds", "integer DEFAULT 0"],
  ];
  for (const [col, type] of liveStreamCols) {
    try {
      await db.execute(sql.raw(`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS ${col} ${type}`));
      fixes.push(`[OK] live_streams.${col}`);
    } catch (e) { fixes.push(`[ERR] live_streams.${col}: ${e.message}`); }
  }

  // game_players — match full Drizzle schema from games.ts
  // Schema expects: id, game_session_id, user_id, role_or_seat (NOT NULL), joined_at, left_at
  const gamePlayerCols = [
    ["left_at", "timestamptz"],
  ];
  for (const [col, type] of gamePlayerCols) {
    try {
      await db.execute(sql.raw(`ALTER TABLE game_players ADD COLUMN IF NOT EXISTS ${col} ${type}`));
      fixes.push(`[OK] game_players.${col}`);
    } catch (e) { fixes.push(`[ERR] game_players.${col}: ${e.message}`); }
  }

  // Also make role_or_seat NOT NULL default if it doesn't have one
  try {
    await db.execute(sql`UPDATE game_players SET role_or_seat = 'PLAYER' WHERE role_or_seat IS NULL`);
    fixes.push("[OK] game_players.role_or_seat backfilled");
  } catch (e) { fixes.push(`[INFO] role_or_seat backfill: ${e.message}`); }

  fixes.forEach(f => console.log(f));

  // Verify
  for (const table of ["live_streams", "game_players"]) {
    const result = await db.execute(sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = ${table}
      order by ordinal_position
    `);
    console.log(`\n${table}: ${result.rows.map(r => r.column_name).join(", ")}`);
  }
  process.exit(0);
}
main();
