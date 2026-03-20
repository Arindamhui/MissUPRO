import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", "..", ".env") });

export default defineConfig({
  schema: "./schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
