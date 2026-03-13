import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl =
	process.env.DATABASE_URL ?? "postgresql://missu:missu_dev_password@localhost:5432/missu";

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
export { schema };
export * from "./schema";
