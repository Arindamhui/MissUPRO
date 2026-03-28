const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");

// Full schema definition of what the Drizzle code expects
const schemaExpectations = {
  live_rooms: {
    room_name: "text NOT NULL DEFAULT ''",
    room_type: "text DEFAULT 'PUBLIC'",
    category: "text NOT NULL DEFAULT 'general'",
    status: "text DEFAULT 'IDLE'",
    total_sessions: "integer DEFAULT 0",
    total_watch_minutes: "integer DEFAULT 0",
    updated_at: "timestamptz DEFAULT now()",
  },
  live_streams: {
    stream_title: "text",
    rtc_channel_id: "text DEFAULT ''",
    viewer_count_peak: "integer DEFAULT 0",
    viewer_count_current: "integer DEFAULT 0",
    gift_revenue_coins: "integer DEFAULT 0",
    end_reason: "text",
    duration_seconds: "integer DEFAULT 0",
    room_id: "uuid",
    stream_type: "text DEFAULT 'SOLO'",
    status: "text DEFAULT 'STARTING'",
  },
  game_sessions: {
    call_session_id: "uuid",
    game_type: "text DEFAULT 'LUDO'",
    status: "text DEFAULT 'CREATED'",
    state_json: "jsonb",
    started_at: "timestamptz",
    ended_at: "timestamptz",
    end_reason: "text",
  },
  game_moves: {
    game_session_id: "uuid",
    actor_user_id: "uuid",
    move_sequence: "integer DEFAULT 0",
    move_payload_json: "jsonb DEFAULT '{}'::jsonb",
    move_hash: "text DEFAULT ''",
    created_at: "timestamptz DEFAULT now()",
  },
  game_players: {
    game_session_id: "uuid",
    role_or_seat: "text DEFAULT 'PLAYER'",
    left_at: "timestamptz",
    joined_at: "timestamptz DEFAULT now()",
  },
  game_results: {
    game_session_id: "uuid",
    winner_user_id: "uuid",
    result_type: "text DEFAULT 'WIN'",
    duration_seconds: "integer DEFAULT 0",
    reward_payload_json: "jsonb",
    created_at: "timestamptz DEFAULT now()",
  },
};

async function main() {
  for (const [table, expectedCols] of Object.entries(schemaExpectations)) {
    // Check if table exists first
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=${table}) as ex
    `);
    if (!tableCheck.rows[0]?.ex) {
      console.log(`[SKIP] ${table} — table doesn't exist`);
      continue;
    }

    // Get existing columns
    const result = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=${table}
    `);
    const existing = new Set(result.rows.map(r => r.column_name));

    for (const [col, colType] of Object.entries(expectedCols)) {
      if (!existing.has(col)) {
        try {
          await db.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${colType}`));
          console.log(`[ADD] ${table}.${col}`);
        } catch (e) {
          console.log(`[ERR] ${table}.${col}: ${e.message}`);
        }
      }
    }
  }

  // Also create game_moves and game_results tables if they don't exist
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        game_session_id uuid,
        winner_user_id uuid,
        result_type text DEFAULT 'WIN',
        duration_seconds integer DEFAULT 0,
        reward_payload_json jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    console.log("[OK] game_results table ensured");
  } catch (e) { console.log(`[INFO] game_results: ${e.message}`); }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_moves (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        game_session_id uuid,
        actor_user_id uuid,
        move_sequence integer DEFAULT 0,
        move_payload_json jsonb DEFAULT '{}'::jsonb,
        move_hash text DEFAULT '',
        created_at timestamptz DEFAULT now()
      )
    `);
    console.log("[OK] game_moves table ensured");
  } catch (e) { console.log(`[INFO] game_moves: ${e.message}`); }

  // Verify all tables
  for (const table of Object.keys(schemaExpectations)) {
    try {
      const r = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name=${table} ORDER BY ordinal_position
      `);
      console.log(`\n${table}: ${r.rows.map(r => r.column_name).join(", ")}`);
    } catch(e) { console.log(`\n${table}: error - ${e.message}`); }
  }

  process.exit(0);
}
main();
