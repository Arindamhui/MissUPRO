import { db, auditLogs } from "@missu/db";

type DbClient = any;

export const auditRepository = {
  async write(values: typeof auditLogs.$inferInsert, dbClient: DbClient = db) {
    await dbClient.insert(auditLogs).values(values);
  },
};