const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const dbUrl = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

async function main() {
  const { neon } = require("@neondatabase/serverless");
  const sql = neon(dbUrl);
  const rows = await sql`SELECT id, email, platform_role, auth_role, auth_provider, password_hash IS NOT NULL as has_password, display_name FROM public.users WHERE email = 'huiarindam6@gmail.com'`;
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(e => console.error("ERROR:", e.message));
