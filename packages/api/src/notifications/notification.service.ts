import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  notifications, notificationPreferences, notificationTemplates,
  notificationCampaigns, pushTokens,
  users,
} from "@missu/db/schema";
import { eq, and, desc, sql, isNull, count, lte, inArray } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";
import { getRedis } from "@missu/utils";
import { randomUUID } from "node:crypto";
import { SocketEmitterService } from "../common/socket-emitter.service";
import { RealtimeStateService } from "../realtime/realtime-state.service";
import { SOCKET_EVENTS } from "@missu/types";

@Injectable()
export class NotificationService {
  constructor(
    private readonly socketEmitterService: SocketEmitterService,
    private readonly realtimeStateService: RealtimeStateService,
  ) {}

  private async emitTrackedUserEvent(userId: string, event: string, payload: Record<string, unknown>, critical = false) {
    const deliveryId = randomUUID();
    const enrichedPayload = { ...payload, deliveryId, emittedAt: new Date().toISOString() };

    await this.realtimeStateService.appendRecentEvent({
      deliveryId,
      event,
      roomId: userId,
      roomScope: "user",
      payload: enrichedPayload,
      critical,
      createdAt: new Date().toISOString(),
    });

    this.socketEmitterService.emitToUser(userId, event, enrichedPayload);

    return enrichedPayload;
  }

  private async getUnreadCount(userId: string) {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return Number(result?.count ?? 0);
  }

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

    if (updated) {
      const unreadCount = await this.getUnreadCount(userId);
      await this.emitTrackedUserEvent(userId, SOCKET_EVENTS.NOTIFICATION.READ, {
        notificationId: updated.id,
        readAt: updated.readAt?.toISOString() ?? new Date().toISOString(),
        unreadCount,
      });
    }

    return updated;
  }

  async markAllAsRead(userId: string) {
    const readAt = new Date();
    await db
      .update(notifications)
      .set({ readAt })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    await this.emitTrackedUserEvent(userId, SOCKET_EVENTS.NOTIFICATION.ALL_READ, {
      readAt: readAt.toISOString(),
      unreadCount: 0,
    });

    return { success: true };
  }

  async createNotification(userId: string, type: string, title: string, body: string, data?: Record<string, any>) {
    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.category, type as any)))
      .limit(1);

    if (prefs[0] && !prefs[0].isEnabled) return null;

    const requestedChannels = Array.isArray(data?.channels)
      ? (data!.channels as string[]).filter((channel): channel is "PUSH" | "EMAIL" => channel === "PUSH" || channel === "EMAIL")
      : ["PUSH"];

    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        notificationType: type as any,
        title,
        body,
        metadataJson: data,
        channel: "IN_APP" as any,
        deliveryStatus: "PENDING" as any,
      })
      .returning();

    if (!notification) {
      return null;
    }

    const jobs: Promise<void>[] = [];
    if (requestedChannels.includes("PUSH")) {
      jobs.push(this.sendPushNotification(notification.id, userId, title, body, data));
    }
    if (requestedChannels.includes("EMAIL")) {
      jobs.push(this.sendEmailNotification(notification.id, userId, title, body, data));
    }

    await Promise.all(jobs);

    const unreadCount = await this.getUnreadCount(userId);
    await this.emitTrackedUserEvent(userId, SOCKET_EVENTS.NOTIFICATION.NEW, {
      notification,
      unreadCount,
    }, true);

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

    const unreadCount = await this.getUnreadCount(userId);
    await this.emitTrackedUserEvent(userId, SOCKET_EVENTS.NOTIFICATION.DELETED, {
      notificationId,
      unreadCount,
    });

    return { success: true };
  }

  async getDeliveryOperations() {
    const redis = getRedis();
    const queueKey = process.env["NOTIFICATION_QUEUE_KEY"] ?? "notifications:dispatch:queue";
    const dlqKey = process.env["NOTIFICATION_DLQ_KEY"] ?? "notifications:dispatch:dlq";
    const now = new Date();

    const [queued, deadLetter, scheduledCampaigns, dueCampaigns] = await Promise.all([
      redis.llen(queueKey),
      redis.llen(dlqKey),
      db.select({ count: count() }).from(notificationCampaigns).where(eq(notificationCampaigns.status, "SCHEDULED" as any)),
      db.select({ count: count() }).from(notificationCampaigns).where(and(eq(notificationCampaigns.status, "SCHEDULED" as any), lte(notificationCampaigns.scheduledAt, now))),
    ]);

    return {
      queuedJobs: queued,
      deadLetterJobs: deadLetter,
      scheduledCampaigns: Number(scheduledCampaigns[0]?.count ?? 0),
      dueCampaigns: Number(dueCampaigns[0]?.count ?? 0),
    };
  }

  async runDueCampaigns(limit = 5) {
    const now = new Date();
    const campaigns = await db
      .select()
      .from(notificationCampaigns)
      .where(and(eq(notificationCampaigns.status, "SCHEDULED" as any), lte(notificationCampaigns.scheduledAt, now)))
      .orderBy(notificationCampaigns.scheduledAt)
      .limit(limit);

    const results: Array<{ campaignId: string; delivered: number }> = [];

    for (const campaign of campaigns) {
      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.id, campaign.templateId))
        .limit(1);

      if (!template) {
        await db.update(notificationCampaigns).set({ status: "CANCELLED" as any, updatedAt: new Date() }).where(eq(notificationCampaigns.id, campaign.id));
        continue;
      }

      const segment = (campaign.segmentRuleJson as { userIds?: string[]; country?: string } | null) ?? {};
      const recipients = await db
        .select({ id: users.id })
        .from(users)
        .where(
          segment.userIds?.length
            ? inArray(users.id, segment.userIds)
            : segment.country
              ? eq(users.country, segment.country)
              : eq(users.status, "ACTIVE" as any),
        )
        .limit(campaign.budgetCapRecipients ?? 500);

      let delivered = 0;
      for (const recipient of recipients) {
        await this.createNotification(
          recipient.id,
          "SYSTEM_ANNOUNCEMENT",
          template.titleTemplate,
          template.bodyTemplate,
          { campaignId: campaign.id, channels: campaign.channel === "ALL" ? ["PUSH", "EMAIL"] : [campaign.channel] },
        );
        delivered += 1;
      }

      await db
        .update(notificationCampaigns)
        .set({
          status: "COMPLETED" as any,
          totalRecipients: recipients.length,
          deliveredCount: delivered,
          updatedAt: new Date(),
        })
        .where(eq(notificationCampaigns.id, campaign.id));

      results.push({ campaignId: campaign.id, delivered });
    }

    return { processed: campaigns.length, results };
  }

  async ensureCampaignTemplate(adminUserId: string) {
    const [existing] = await db
      .select()
      .from(notificationTemplates)
      .where(and(eq(notificationTemplates.templateKey, "generic-campaign"), eq(notificationTemplates.locale, "en"), eq(notificationTemplates.channel, "PUSH" as any)))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(notificationTemplates)
      .values({
        templateKey: "generic-campaign",
        locale: "en",
        channel: "PUSH" as any,
        titleTemplate: "MissUPRO update",
        bodyTemplate: "There is something new waiting for you in MissUPRO.",
        variablesJson: {},
        updatedByAdminId: adminUserId,
      })
      .returning();

    return created!;
  }

  async createCampaign(data: { name: string; campaignType: string; segmentRuleJson?: any; scheduledAt?: Date }, adminUserId: string) {
    const template = await this.ensureCampaignTemplate(adminUserId);
    const [campaign] = await db
      .insert(notificationCampaigns)
      .values({
        name: data.name,
        campaignType: data.campaignType as any,
        templateId: template.id,
        segmentRuleJson: data.segmentRuleJson ?? {},
        channel: "ALL" as any,
        scheduleType: data.scheduledAt ? "SCHEDULED" as any : "IMMEDIATE" as any,
        scheduledAt: data.scheduledAt ?? new Date(),
        status: "SCHEDULED" as any,
        createdByAdminId: adminUserId,
      })
      .returning();

    return campaign!;
  }

  private async enqueueDispatchJob(job: Record<string, unknown>) {
    const redis = getRedis();
    const queueKey = process.env["NOTIFICATION_QUEUE_KEY"] ?? "notifications:dispatch:queue";
    await redis.lpush(queueKey, JSON.stringify(job));
  }

  private async sendPushNotification(notificationId: string, userId: string, title: string, body: string, data?: Record<string, any>) {
    const tokens = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    if (tokens.length === 0) {
      await db
        .update(notifications)
        .set({ deliveryStatus: "FAILED" as any })
        .where(eq(notifications.id, notificationId));
      return;
    }

    for (const token of tokens) {
      await this.enqueueDispatchJob({
        notificationId,
        userId,
        title,
        body,
        data,
        channel: "PUSH",
        platform: token.platform,
        token: token.token,
        attempt: 1,
        queuedAt: new Date().toISOString(),
      });
    }

    await db
      .update(notifications)
      .set({ deliveryStatus: "SENT" as any })
      .where(eq(notifications.id, notificationId));
  }

  private async sendEmailNotification(notificationId: string, userId: string, title: string, body: string, data?: Record<string, any>) {
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.email) {
      return;
    }

    await this.enqueueDispatchJob({
      notificationId,
      userId,
      title,
      body,
      data,
      channel: "EMAIL",
      email: user.email,
      attempt: 1,
      queuedAt: new Date().toISOString(),
    });
  }
}
