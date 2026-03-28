// Add missing columns to match Drizzle schema expectations
const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");

async function main() {
  const fixes = [];

  // 1. dm_conversations: add user_id_1 / user_id_2 as aliases for participant_a_id / participant_b_id
  try {
    await db.execute(sql`ALTER TABLE dm_conversations ADD COLUMN IF NOT EXISTS user_id_1 uuid`);
    await db.execute(sql`UPDATE dm_conversations SET user_id_1 = participant_a_id WHERE user_id_1 IS NULL`);
    fixes.push("[OK] dm_conversations.user_id_1");
  } catch (e) { fixes.push(`[ERR] dm_conversations.user_id_1: ${e.message}`); }

  try {
    await db.execute(sql`ALTER TABLE dm_conversations ADD COLUMN IF NOT EXISTS user_id_2 uuid`);
    await db.execute(sql`UPDATE dm_conversations SET user_id_2 = participant_b_id WHERE user_id_2 IS NULL`);
    fixes.push("[OK] dm_conversations.user_id_2");
  } catch (e) { fixes.push(`[ERR] dm_conversations.user_id_2: ${e.message}`); }

  // Also add unread_count_user_1 / unread_count_user_2 that the modern schema expects
  try {
    await db.execute(sql`ALTER TABLE dm_conversations ADD COLUMN IF NOT EXISTS unread_count_user_1 integer DEFAULT 0`);
    await db.execute(sql`ALTER TABLE dm_conversations ADD COLUMN IF NOT EXISTS unread_count_user_2 integer DEFAULT 0`);
    fixes.push("[OK] dm_conversations.unread_count_user_1/2");
  } catch (e) { fixes.push(`[ERR] dm_conversations.unread_count: ${e.message}`); }

  // Also add last_message_text, updated_at if scheme expects them
  try {
    await db.execute(sql`ALTER TABLE dm_conversations ADD COLUMN IF NOT EXISTS last_message_text text`);
    await db.execute(sql`ALTER TABLE dm_conversations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`);
    fixes.push("[OK] dm_conversations.last_message_text/updated_at");
  } catch (e) { fixes.push(`[ERR] dm_conversations extra cols: ${e.message}`); }

  // 2. live_streams: add room_id as alias for live_room_id
  try {
    await db.execute(sql`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS room_id uuid`);
    await db.execute(sql`UPDATE live_streams SET room_id = live_room_id WHERE room_id IS NULL`);
    fixes.push("[OK] live_streams.room_id");
  } catch (e) { fixes.push(`[ERR] live_streams.room_id: ${e.message}`); }

  // Also add columns the modern schema expects
  try {
    await db.execute(sql`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS title text`);
    await db.execute(sql`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS stream_type text DEFAULT 'SOLO'`);
    await db.execute(sql`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS status text DEFAULT 'LIVE'`);
    await db.execute(sql`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS viewer_count integer DEFAULT 0`);
    await db.execute(sql`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS thumbnail_url text`);
    fixes.push("[OK] live_streams additional modern cols");
  } catch (e) { fixes.push(`[ERR] live_streams additional: ${e.message}`); }

  // 3. game_players: add game_session_id as alias for session_id
  try {
    await db.execute(sql`ALTER TABLE game_players ADD COLUMN IF NOT EXISTS game_session_id uuid`);
    await db.execute(sql`UPDATE game_players SET game_session_id = session_id WHERE game_session_id IS NULL`);
    fixes.push("[OK] game_players.game_session_id");
  } catch (e) { fixes.push(`[ERR] game_players.game_session_id: ${e.message}`); }

  // game_players may also need additional columns the schema expects
  try {
    await db.execute(sql`ALTER TABLE game_players ADD COLUMN IF NOT EXISTS seat_number integer`);
    await db.execute(sql`ALTER TABLE game_players ADD COLUMN IF NOT EXISTS is_ready boolean DEFAULT false`);
    await db.execute(sql`ALTER TABLE game_players ADD COLUMN IF NOT EXISTS state_json jsonb`);
    fixes.push("[OK] game_players additional cols");
  } catch (e) { fixes.push(`[ERR] game_players additional: ${e.message}`); }

  fixes.forEach(f => console.log(f));

  // Verify
  for (const table of ["dm_conversations", "live_streams", "game_players"]) {
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
