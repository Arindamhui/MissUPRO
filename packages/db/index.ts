import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema/index";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", "..", ".env") });

const databaseUrl =
	process.env.DATABASE_URL ?? "postgresql://missu:missu_dev_password@localhost:5432/missu";

function isNeonDatabaseUrl(value: string) {
	try {
		return new URL(value).hostname.toLowerCase().includes("neon.tech");
	} catch {
		return false;
	}
}

export const db: PgDatabase<any, typeof schema> = isNeonDatabaseUrl(databaseUrl)
	? drizzleNeon(neon(databaseUrl), { schema })
	: drizzlePg(new Pool({ connectionString: databaseUrl }), { schema });

export type Database = typeof db;
export { schema };
export * from "./schema/index";
