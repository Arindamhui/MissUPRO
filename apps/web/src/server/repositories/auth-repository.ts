import { db, authSessions, securityEvents } from "@missu/db";
import { eq } from "drizzle-orm";

type DbClient = any;

export const authRepository = {
  async createSession(values: typeof authSessions.$inferInsert, dbClient: DbClient = db) {
    const result = await dbClient.insert(authSessions).values(values).returning();
    return result[0] ?? null;
  },

  async getSessionById(sessionId: string) {
    return db.query.authSessions.findFirst({ where: eq(authSessions.id, sessionId) });
  },

  async rotateRefreshToken(sessionId: string, refreshTokenHash: string, expiresAt: Date, dbClient: DbClient = db) {
    const result = await dbClient
      .update(authSessions)
      .set({ refreshTokenHash, expiresAt, lastSeenAt: new Date() })
      .where(eq(authSessions.id, sessionId))
      .returning();

    return result[0] ?? null;
  },

  async revokeSession(sessionId: string, dbClient: DbClient = db) {
    const result = await dbClient
      .update(authSessions)
      .set({ sessionStatus: "REVOKED", lastSeenAt: new Date() })
      .where(eq(authSessions.id, sessionId))
      .returning();
    return result[0] ?? null;
  },

  async createSecurityEvent(values: typeof securityEvents.$inferInsert, dbClient: DbClient = db) {
    try {
      await dbClient.insert(securityEvents).values(values);
    } catch {
      // Security-event logging must not block user auth flows in the web portal.
    }
  },
};