import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { mediaScanResults, mediaAssets, fraudFlags, securityEvents, securityIncidents, reports, bans } from "@missu/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";
import { getRedis } from "@missu/utils";

@Injectable()
export class ModerationService {
  private readonly BLOCKED_PATTERNS = [
    /\b(phone|number|whatsapp|telegram|signal|call\s*me)\b/i,
    /\b\d{10,}\b/,
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
  ];

  async evaluateChatMessage(message: string, userId: string, context: { roomType: string; roomId: string }) {
    const violations: string[] = [];

    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(message)) {
        violations.push("contact_info_sharing");
        break;
      }
    }

    if (message.length > DEFAULTS.MODERATION.MAX_MESSAGE_LENGTH) {
      violations.push("message_too_long");
    }

    const isSpam = await this.checkSpamRate(userId, context.roomId);
    if (isSpam) violations.push("spam_detected");

    const isClean = violations.length === 0;

    if (!isClean) {
      await db.insert(fraudFlags).values({
        entityType: "USER" as any,
        entityId: userId,
        riskScore: violations.includes("contact_info_sharing") ? 80 : 40,
        riskLevel: violations.includes("contact_info_sharing") ? "HIGH" : "MEDIUM" as any,
        signalsJson: { violations, message: message.substring(0, 200), context },
        status: "OPEN" as any,
      });
    }

    return { allowed: isClean, violations, sanitizedMessage: isClean ? message : this.sanitizeMessage(message) };
  }

  async scanMedia(assetId: string) {
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
    if (!asset) throw new Error("Asset not found");

    const [result] = await db
      .insert(mediaScanResults)
      .values({
        mediaAssetId: assetId,
        scannerName: "automated",
        scanStatus: "PASSED" as any,
        riskLabelsJson: { scanner: "automated", timestamp: new Date().toISOString() },
        scannedAt: new Date(),
      })
      .returning();

    return result;
  }

  async getContentReport(startDate: Date, endDate: Date) {
    const flagCounts = await db
      .select({
        entityType: fraudFlags.entityType,
        count: sql<number>`count(*)`,
      })
      .from(fraudFlags)
      .where(sql`${fraudFlags.createdAt} BETWEEN ${startDate} AND ${endDate}`)
      .groupBy(fraudFlags.entityType);

    const scanCounts = await db
      .select({
        scanStatus: mediaScanResults.scanStatus,
        count: sql<number>`count(*)`,
      })
      .from(mediaScanResults)
      .where(sql`${mediaScanResults.createdAt} BETWEEN ${startDate} AND ${endDate}`)
      .groupBy(mediaScanResults.scanStatus);

    const reportCounts = await db
      .select({
        status: reports.status,
        count: sql<number>`count(*)`,
      })
      .from(reports)
      .where(sql`${reports.createdAt} BETWEEN ${startDate} AND ${endDate}`)
      .groupBy(reports.status);

    const banCounts = await db
      .select({
        status: bans.status,
        count: sql<number>`count(*)`,
      })
      .from(bans)
      .where(sql`${bans.createdAt} BETWEEN ${startDate} AND ${endDate}`)
      .groupBy(bans.status);

    return { flagCounts, scanCounts, reportCounts, banCounts };
  }

  async submitReport(
    reporterUserId: string,
    data: {
      entityType: "USER" | "LIVE_STREAM" | "DM_MESSAGE" | "CALL_SESSION" | "GIFT_TRANSACTION" | "PAYMENT" | "MEDIA_ASSET" | "COMMENT";
      entityId: string;
      reasonCode: string;
      description?: string;
      evidenceJson?: Record<string, unknown>;
    },
  ) {
    const existingPriority = data.evidenceJson?.severity === "high" ? 80 : 25;
    const [report] = await db
      .insert(reports)
      .values({
        reporterUserId,
        entityType: data.entityType as any,
        entityId: data.entityId,
        reasonCode: data.reasonCode,
        description: data.description ?? null,
        evidenceJson: data.evidenceJson ?? null,
        priorityScore: existingPriority,
      })
      .returning();

    return report!;
  }

  async listReports(filters: { status?: string; entityType?: string; limit?: number }) {
    const conditions = [] as any[];
    if (filters.status) conditions.push(eq(reports.status, filters.status as any));
    if (filters.entityType) conditions.push(eq(reports.entityType, filters.entityType as any));

    return db
      .select()
      .from(reports)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(reports.priorityScore), desc(reports.createdAt))
      .limit(filters.limit ?? 100);
  }

  async reviewReport(reportId: string, adminId: string, status: "UNDER_REVIEW" | "ACTIONED" | "DISMISSED" | "RESOLVED", resolutionNotes?: string) {
    const [updated] = await db
      .update(reports)
      .set({
        status: status as any,
        reviewedByAdminId: adminId as any,
        reviewedAt: new Date(),
        resolutionNotes: resolutionNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    return updated;
  }

  async listBans(filters: { status?: string; scope?: string; limit?: number }) {
    const conditions = [] as any[];
    if (filters.status) conditions.push(eq(bans.status, filters.status as any));
    if (filters.scope) conditions.push(eq(bans.scope, filters.scope as any));

    return db
      .select()
      .from(bans)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(bans.createdAt))
      .limit(filters.limit ?? 100);
  }

  async imposeBan(
    adminId: string,
    data: {
      userId: string;
      scope: "ACCOUNT" | "LIVE" | "DM" | "CALL" | "WITHDRAWAL";
      reason: "HARASSMENT" | "SPAM" | "FRAUD" | "CHARGEBACK_ABUSE" | "SELF_GIFTING" | "UNDERAGE_RISK" | "POLICY_VIOLATION" | "OTHER";
      sourceReportId?: string;
      notes?: string;
      endsAt?: Date | null;
    },
  ) {
    const [ban] = await db
      .insert(bans)
      .values({
        userId: data.userId,
        scope: data.scope as any,
        reason: data.reason as any,
        sourceReportId: data.sourceReportId ?? null,
        imposedByAdminId: adminId as any,
        notes: data.notes ?? null,
        endsAt: data.endsAt ?? null,
      })
      .returning();

    return ban!;
  }

  async revokeBan(banId: string, adminId: string, notes?: string) {
    const [updated] = await db
      .update(bans)
      .set({
        status: "REVOKED" as any,
        revokedAt: new Date(),
        revokedByAdminId: adminId as any,
        notes: notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(bans.id, banId))
      .returning();

    return updated;
  }

  async reportSevereViolation(userId: string, category: "CSAM" | "TERROR" | "EXTREME_VIOLENCE", evidence: { assetId?: string; note?: string }) {
    const [event] = await db
      .insert(securityEvents)
      .values({
        eventType: "API_ABUSE_DETECTED" as any,
        actorUserId: userId,
        ipAddress: "system",
        severity: "CRITICAL" as any,
        detailsJson: {
          category,
          evidence,
        },
        relatedEntityType: "USER",
        relatedEntityId: userId,
      } as any)
      .returning();

    const [incident] = await db
      .insert(securityIncidents)
      .values({
        incidentType: `SEVERE_CONTENT_${category}`,
        severity: "SEV1" as any,
        status: "OPEN" as any,
        sourceEventId: event?.id,
        ownerAdminId: userId,
        startedAt: new Date(),
      } as any)
      .returning();

    await db.insert(fraudFlags).values({
      entityType: "USER" as any,
      entityId: userId,
      riskScore: 100,
      riskLevel: "HIGH" as any,
      signalsJson: {
        category,
        evidence,
        incidentId: incident?.id,
      },
      status: "OPEN" as any,
    });

    return {
      userId,
      incident,
      securityEvent: event,
      escalated: true,
    };
  }

  private async checkSpamRate(userId: string, roomId: string): Promise<boolean> {
    const key = `moderation:spam:${roomId}:${userId}`;
    const now = Date.now();
    const windowMs = 60_000;
    const maxMessagesPerWindow = 20;

    try {
      const redis = getRedis();
      await redis
        .multi()
        .zadd(key, now, String(now))
        .zremrangebyscore(key, 0, now - windowMs)
        .expire(key, Math.ceil(windowMs / 1000))
        .exec();

      const count = await redis.zcard(key);
      return count > maxMessagesPerWindow;
    } catch {
      // Fail open if Redis is unavailable to avoid blocking chat flow.
      return false;
    }
  }

  private sanitizeMessage(message: string): string {
    let sanitized = message;
    for (const pattern of this.BLOCKED_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[removed]");
    }
    return sanitized;
  }
}
