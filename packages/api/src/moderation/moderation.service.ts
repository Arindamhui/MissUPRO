import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { mediaScanResults, mediaAssets, fraudFlags } from "@missu/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";

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
        scanStatus: "CLEAN" as any,
        riskLabelsJson: { scanner: "placeholder", timestamp: new Date().toISOString() },
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

    return { flagCounts, scanCounts };
  }

  private async checkSpamRate(userId: string, roomId: string): Promise<boolean> {
    return false;
  }

  private sanitizeMessage(message: string): string {
    let sanitized = message;
    for (const pattern of this.BLOCKED_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[removed]");
    }
    return sanitized;
  }
}
