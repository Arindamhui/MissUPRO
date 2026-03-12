import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { securityIncidents, securityEvents } from "@missu/db/schema";
import { eq, and, desc, count, gte } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";

@Injectable()
export class SecurityService {
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
}
