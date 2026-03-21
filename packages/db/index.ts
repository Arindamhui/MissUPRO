import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema/index";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", "..", ".env") });

const databaseUrl =
	process.env.DATABASE_URL ?? "postgresql://missu:missu_dev_password@localhost:5432/missu";

const isNeonHost = databaseUrl.includes("neon.tech");

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isNeonHost ? { rejectUnauthorized: false } : undefined,
});

export const db: PgDatabase<any, typeof schema> = drizzlePg(pool, { schema });

// ─── Read Replica (optional) ───
// Set DATABASE_READ_URL for read-replica routing in high-traffic deployments.
// Falls back to primary pool when not configured.
const readReplicaUrl = process.env.DATABASE_READ_URL;
const isReadNeon = readReplicaUrl?.includes("neon.tech");
export const readPool = readReplicaUrl ? new Pool({ connectionString: readReplicaUrl, ssl: isReadNeon ? { rejectUnauthorized: false } : undefined }) : pool;
export const readDb: PgDatabase<any, typeof schema> = readReplicaUrl
  ? drizzlePg(readPool, { schema })
  : db;

export type Database = typeof db;
export { schema };
export * from "./schema/index";
