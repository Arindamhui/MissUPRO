const { Pool } = require("pg");
require("dotenv").config({ path: ".env" });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // Check FK constraint
  const fk = await pool.query(
    `SELECT tc.constraint_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
     FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
     WHERE tc.table_name='agencies' AND tc.constraint_type='FOREIGN KEY' AND tc.constraint_name LIKE '%approved%'`
  );
  console.log("FK constraints for approved_by_admin_id:");
  fk.rows.forEach(r => console.log(`  ${r.constraint_name} -> ${r.foreign_table}(${r.foreign_column})`));

  // Check admins table
  const admin = await pool.query("SELECT id, user_id FROM admins LIMIT 3");
  console.log("\nAdmin records:");
  admin.rows.forEach(r => console.log(`  adminId=${r.id}, userId=${r.user_id}`));

  pool.end();
})().catch(e => { console.error(e.message); pool.end(); });
