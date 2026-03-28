const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");
async function main() {
  const r = await db.execute(sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name='users' AND column_name LIKE '%clerk%'
    ORDER BY column_name
  `);
  console.log("clerk-related columns in users:", r.rows.map(x => x.column_name));
  process.exit(0);
}
main();
