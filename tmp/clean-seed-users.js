const { Client } = require("pg");
const fs = require("fs");

const envLine = fs.readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL="));
const url = envLine.replace("DATABASE_URL=", "").trim();
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function getAllFKs() {
  const { rows } = await c.query(`
    SELECT tc.table_name AS child_table, kcu.column_name AS child_column,
           ccu.table_name AS parent_table, ccu.column_name AS parent_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `);
  return rows;
}

async function run() {
  await c.connect();

  const { rows } = await c.query("SELECT id FROM users WHERE clerk_id IS NULL");
  const ids = rows.map((r) => r.id);
  console.log("Fake user IDs to delete:", ids.length);
  if (ids.length === 0) {
    console.log("Nothing to clean.");
    await c.end();
    return;
  }

  const allFKs = await getAllFKs();

  // Find direct FK refs to users.id
  const directRefs = allFKs.filter((fk) => fk.parent_table === "users" && fk.parent_column === "id");
  console.log("Direct FK refs to users.id:", directRefs.length);

  // For each direct ref table, find IDs of rows belonging to fake users, then
  // recursively delete their children before deleting them.
  async function cascadeDelete(tableName, columnName, parentIds) {
    if (parentIds.length === 0) return;

    // Find this table's PK column
    const pkRes = await c.query(`
      SELECT kcu.column_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1 AND tc.table_schema = 'public'
      LIMIT 1
    `, [tableName]);
    const pkCol = pkRes.rows[0]?.column_name;

    if (pkCol) {
      // Find IDs of rows in this table that will be deleted
      const idsRes = await c.query(
        `SELECT "${pkCol}" FROM "${tableName}" WHERE "${columnName}" = ANY($1::uuid[])`,
        [parentIds]
      );
      const childIds = idsRes.rows.map((r) => r[pkCol]);

      if (childIds.length > 0) {
        // Find tables that reference this table's PK
        const childFKs = allFKs.filter((fk) => fk.parent_table === tableName && fk.parent_column === pkCol);
        for (const childFK of childFKs) {
          await cascadeDelete(childFK.child_table, childFK.child_column, childIds);
        }
      }
    }

    // Now safe to delete from this table
    try {
      const res = await c.query(
        `DELETE FROM "${tableName}" WHERE "${columnName}" = ANY($1::uuid[])`,
        [parentIds]
      );
      if (res.rowCount > 0) console.log(`  Deleted ${res.rowCount} from ${tableName}.${columnName}`);
    } catch (err) {
      // Try SET NULL as fallback
      try {
        const res = await c.query(
          `UPDATE "${tableName}" SET "${columnName}" = NULL WHERE "${columnName}" = ANY($1::uuid[])`,
          [parentIds]
        );
        if (res.rowCount > 0) console.log(`  SET NULL ${res.rowCount} in ${tableName}.${columnName}`);
      } catch (e2) {
        console.log(`  FAILED ${tableName}.${columnName}: ${e2.message.split("\n")[0]}`);
      }
    }
  }

  for (const ref of directRefs) {
    await cascadeDelete(ref.child_table, ref.child_column, ids);
  }

  // Delete the users themselves
  const del = await c.query("DELETE FROM users WHERE clerk_id IS NULL");
  console.log(`\nDeleted ${del.rowCount} fake/seed users`);

  const remaining = await c.query("SELECT id, email, clerk_id, display_name FROM users ORDER BY created_at");
  console.log(`\nUsers remaining: ${remaining.rows.length}`);
  for (const u of remaining.rows) {
    console.log(`  ${u.id} | ${u.email} | clerk=${u.clerk_id || "NULL"} | ${u.display_name}`);
  }

  await c.end();
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
