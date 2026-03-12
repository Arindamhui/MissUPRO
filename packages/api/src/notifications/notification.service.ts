import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  notifications, notificationPreferences, notificationTemplates,
  notificationCampaigns, pushTokens,
} from "@missu/db/schema";
import { eq, and, desc, sql, gte, isNull, or } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";
import { DEFAULTS } from "@missu/config";

@Injectable()
export class NotificationService {
  async getNotificationCenter(userId: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;

    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return {
      items,
      unreadCount: Number(unreadCount[0]?.count ?? 0),
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();
    return updated;
  }

  async markAllAsRead(userId: string) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return { success: true };
  }

  async createNotification(userId: string, type: string, title: string, body: string, data?: Record<string, any>) {
    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.category, type as any)))
      .limit(1);

    if (prefs[0] && !prefs[0].isEnabled) return null;

    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        notificationType: type as any,
        title,
        body,
        metadataJson: data,
        channel: "PUSH" as any,
        deliveryStatus: "PENDING" as any,
      })
      .returning();

    await this.sendPushNotification(userId, title, body, data);

    return notification;
  }

  async getPreferences(userId: string) {
    return db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
  }

  async updatePreference(userId: string, category: string, channel: string, isEnabled: boolean) {
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.category, category as any), eq(notificationPreferences.channel, channel as any)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({ isEnabled, updatedAt: new Date() })
        .where(eq(notificationPreferences.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(notificationPreferences)
      .values({ userId, category: category as any, channel: channel as any, isEnabled })
      .returning();
    return created;
  }

  async getActiveCampaignBanners() {
    const now = new Date();
    return db
      .select()
      .from(notificationCampaigns)
      .where(
        and(
          eq(notificationCampaigns.status, "SCHEDULED" as any),
          sql`${notificationCampaigns.scheduledAt} <= ${now}`,
        ),
      )
      .orderBy(desc(notificationCampaigns.createdAt));
  }

  async deleteNotification(notificationId: string, userId: string) {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    return { success: true };
  }

  private async sendPushNotification(userId: string, title: string, body: string, data?: Record<string, any>) {
    const tokens = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    for (const token of tokens) {
      // FCM / APNs push implementation delegated to external service
      // This is where we'd call Firebase Admin SDK or APNs
      console.log(`[PUSH] ${token.platform}:${token.token.substring(0, 8)}... -> ${title}`);
    }
  }
}
