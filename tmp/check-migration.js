require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const result = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='google_id'"
    );
    console.log(result.rows.length > 0 ? 'MIGRATION_ALREADY_APPLIED' : 'MIGRATION_NEEDED');

    if (result.rows.length === 0) {
      // Check if index exists
      const idxResult = await pool.query(
        "SELECT indexname FROM pg_indexes WHERE tablename='users' AND indexname='users_google_id_idx'"
      );
      console.log('Index exists:', idxResult.rows.length > 0);
    }
  } catch (e) {
    console.error('DB_ERROR:', e.message);
  } finally {
    await pool.end();
  }
}
main();
