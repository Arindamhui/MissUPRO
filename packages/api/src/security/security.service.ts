import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { securityIncidents, securityEvents, authSessions, users } from "@missu/db/schema";
import { eq, and, desc, count, gte, sql } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";

@Injectable()
export class SecurityService {
  private userSchemaModePromise?: Promise<"modern" | "legacy">;

  private async getUserSchemaMode() {
    if (!this.userSchemaModePromise) {
      this.userSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'users'
            and column_name = 'display_name'
        ) as has_display_name
      `).then((result) => {
        const value = result.rows[0] as { has_display_name?: boolean | string | number } | undefined;
        return value?.has_display_name ? "modern" : "legacy";
      }).catch(() => "modern" as const);
    }

    return this.userSchemaModePromise;
  }

  async createIncident(data: { incidentType: string; severity: string; ownerAdminId: string }) {
    const [incident] = await db
      .insert(securityIncidents)
      .values({
        incidentType: data.incidentType as any,
        severity: data.severity as any,
        ownerAdminId: data.ownerAdminId,
        status: "OPEN" as any,
        startedAt: new Date(),
      })
      .returning();

    return incident;
  }

  async listIncidents(status?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [];
    if (status) conditions.push(eq(securityIncidents.status, status as any));

    const results = await db
      .select()
      .from(securityIncidents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(securityIncidents.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async updateIncident(incidentId: string, data: { status?: string; postmortemUrl?: string }) {
    const update: any = {};
    if (data.status) update.status = data.status;
    if (data.postmortemUrl) update.postmortemUrl = data.postmortemUrl;
    if (data.status === "RESOLVED") update.resolvedAt = new Date();

    const [updated] = await db.update(securityIncidents).set(update).where(eq(securityIncidents.id, incidentId)).returning();
    return updated;
  }

  async getSecurityDashboard() {
    const openIncidents = await db.select({ count: count() }).from(securityIncidents).where(eq(securityIncidents.status, "OPEN" as any));
    const recentEvents = await db
      .select()
      .from(securityEvents)
      .orderBy(desc(securityEvents.createdAt))
      .limit(50);

    const suspiciousLogins = await db
      .select({ count: count() })
      .from(securityEvents)
      .where(and(eq(securityEvents.eventType, "SUSPICIOUS_LOGIN" as any), gte(securityEvents.createdAt, new Date(Date.now() - 86400_000))));

    return {
      openIncidents: Number(openIncidents[0]?.count ?? 0),
      suspiciousLoginsLast24h: Number(suspiciousLogins[0]?.count ?? 0),
      recentEvents,
    };
  }

  async logSecurityEvent(actorUserId: string, eventType: string, detailsJson: Record<string, any>, ip?: string, userAgent?: string) {
    const [event] = await db
      .insert(securityEvents)
      .values({
        actorUserId,
        eventType: eventType as any,
        severity: "MEDIUM" as any,
        ipAddress: ip ?? "",
        userAgent: userAgent ?? "",
        deviceFingerprintHash: "",
        detailsJson,
      })
      .returning();
    return event;
  }

  async listSessions(userId?: string, cursor?: string, limit = 50) {
    if (await this.getUserSchemaMode() === "legacy") {
      const offset = cursor ? decodeCursor(cursor) : 0;
      const userFilter = userId ? sql`where s.user_id = ${userId}::uuid` : sql``;
      const results = await db.execute(sql`
        select
          s.id,
          s.user_id as "userId",
          s.session_status as "sessionStatus",
          s.last_seen_at as "lastSeenAt",
          s.expires_at as "expiresAt",
          s.created_at as "createdAt",
          u.email as "userEmail",
          coalesce(p.display_name, u.username) as "userDisplayName"
        from auth_sessions s
        inner join users u on u.id = s.user_id
        left join profiles p on p.user_id = u.id
        ${userFilter}
        order by s.created_at desc
        limit ${limit + 1}
        offset ${offset}
      `);
      const hasMore = results.rows.length > limit;
      return {
        items: hasMore ? results.rows.slice(0, limit) : results.rows,
        nextCursor: hasMore ? encodeCursor(offset + limit) : null,
      };
    }

    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions = userId ? [eq(authSessions.userId, userId)] : [];
    const results = await db
      .select({
        id: authSessions.id,
        userId: authSessions.userId,
        sessionStatus: authSessions.sessionStatus,
        lastSeenAt: authSessions.lastSeenAt,
        expiresAt: authSessions.expiresAt,
        createdAt: authSessions.createdAt,
        userEmail: users.email,
        userDisplayName: users.displayName,
      })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(authSessions.createdAt))
      .limit(limit + 1)
      .offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async getSessionMonitoringSummary() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (await this.getUserSchemaMode() === "legacy") {
      const [activeSessions, stepUpRequired, highRiskSessions, activeAdminSessions, recentAdminSessionsResult] = await Promise.all([
        db.select({ count: count() }).from(authSessions).where(eq(authSessions.sessionStatus, "ACTIVE" as any)),
        db.select({ count: count() }).from(authSessions).where(eq(authSessions.sessionStatus, "STEP_UP_REQUIRED" as any)),
        db.select({ count: count() }).from(authSessions).where(and(eq(authSessions.sessionStatus, "ACTIVE" as any), gte(authSessions.riskScore, 70))),
        db.execute(sql`
          select count(*)::int as count
          from auth_sessions s
          inner join users u on u.id = s.user_id
          where s.session_status = 'ACTIVE' and u.role = 'ADMIN'
        `),
        db.execute(sql`
          select
            s.id as "sessionId",
            s.user_id as "userId",
            coalesce(p.display_name, u.username) as "displayName",
            s.risk_score as "riskScore",
            s.last_seen_at as "lastSeenAt",
            s.created_at as "createdAt"
          from auth_sessions s
          inner join users u on u.id = s.user_id
          left join profiles p on p.user_id = u.id
          where u.role = 'ADMIN'
            and s.created_at >= ${since24h}
          order by s.created_at desc
          limit 10
        `),
      ]);

      return {
        activeSessions: Number(activeSessions[0]?.count ?? 0),
        stepUpRequired: Number(stepUpRequired[0]?.count ?? 0),
        highRiskSessions: Number(highRiskSessions[0]?.count ?? 0),
        activeAdminSessions: Number((activeAdminSessions.rows[0] as { count?: number | string } | undefined)?.count ?? 0),
        recentAdminSessions: recentAdminSessionsResult.rows,
      };
    }

    const [activeSessions, stepUpRequired, highRiskSessions, activeAdminSessions, recentAdminSessions] = await Promise.all([
      db.select({ count: count() }).from(authSessions).where(eq(authSessions.sessionStatus, "ACTIVE" as any)),
      db.select({ count: count() }).from(authSessions).where(eq(authSessions.sessionStatus, "STEP_UP_REQUIRED" as any)),
      db.select({ count: count() }).from(authSessions).where(and(eq(authSessions.sessionStatus, "ACTIVE" as any), gte(authSessions.riskScore, 70))),
      db
        .select({ count: count() })
        .from(authSessions)
        .innerJoin(users, eq(users.id, authSessions.userId))
        .where(and(eq(authSessions.sessionStatus, "ACTIVE" as any), eq(users.role, "ADMIN" as any))),
      db
        .select({
          sessionId: authSessions.id,
          userId: authSessions.userId,
          displayName: users.displayName,
          riskScore: authSessions.riskScore,
          lastSeenAt: authSessions.lastSeenAt,
          createdAt: authSessions.createdAt,
        })
        .from(authSessions)
        .innerJoin(users, eq(users.id, authSessions.userId))
        .where(and(eq(users.role, "ADMIN" as any), gte(authSessions.createdAt, since24h)))
        .orderBy(desc(authSessions.createdAt))
        .limit(10),
    ]);

    return {
      activeSessions: Number(activeSessions[0]?.count ?? 0),
      stepUpRequired: Number(stepUpRequired[0]?.count ?? 0),
      highRiskSessions: Number(highRiskSessions[0]?.count ?? 0),
      activeAdminSessions: Number(activeAdminSessions[0]?.count ?? 0),
      recentAdminSessions,
    };
  }

  async revokeSessionByAdmin(sessionId: string, adminUserId: string) {
    const [session] = await db.select().from(authSessions).where(eq(authSessions.id, sessionId)).limit(1);
    await db
      .update(authSessions)
      .set({ sessionStatus: "REVOKED" as any })
      .where(eq(authSessions.id, sessionId));
    if (session) {
      await this.logSecurityEvent(adminUserId, "SESSION_REVOKED" as any, { byAdmin: true, sessionId, targetUserId: session.userId });
    }
    return { success: true };
  }

  async requireSessionStepUp(sessionId: string, adminUserId: string, reason: string) {
    const [updated] = await db
      .update(authSessions)
      .set({
        sessionStatus: "STEP_UP_REQUIRED" as any,
        riskScore: 100,
      })
      .where(eq(authSessions.id, sessionId))
      .returning();

    if (updated) {
      await this.logSecurityEvent(adminUserId, "MFA_CHALLENGE", {
        initiatedByAdmin: true,
        sessionId,
        targetUserId: updated.userId,
        reason,
      });
    }

    return updated ?? null;
  }
}
