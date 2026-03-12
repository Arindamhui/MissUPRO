import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  users, profiles, models, modelApplications, wallets,
  coinTransactions, diamondTransactions, payments, withdrawRequests,
  gifts, giftTransactions, vipSubscriptions, agencies, agencyHosts,
  adminLogs, admins, systemSettings, featureFlags,
  uiLayoutConfigs, homepageSections,
  liveRooms, callSessions, chatSessions,
  mediaScanResults, fraudFlags, levels,
  campaigns, banners, themes, promotions, badges,
  modelLevelRules, callPricingRules, securityIncidents,
  groupAudioRooms, partyRooms, pkSessions,
  dmConversations, dmMessages, notificationCampaigns,
} from "@missu/db/schema";
import { eq, and, desc, asc, sql, gte, lte, count, sum, between, like, isNull, not, inArray, isNotNull } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";
import { cacheDel } from "@missu/utils";

@Injectable()
export class AdminService {
  // ─── User Management ───
  async listUsers(cursor?: string, limit = 20, search?: string) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [];
    if (search) conditions.push(like(users.displayName, `%${search}%`));

    const results = await db
      .select({
        id: users.id, email: users.email, role: users.role,
        status: users.status, displayName: users.displayName,
        avatarUrl: users.avatarUrl, createdAt: users.createdAt,
      })
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async getUserDetail(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    return { user, profile, wallet };
  }

  async updateUserStatus(userId: string, status: string, adminId: string) {
    const [updated] = await db.update(users).set({ status: status as any, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    await this.logAction(adminId, "user_status_update", { userId, status });
    return updated;
  }

  async updateUserRole(userId: string, role: string, adminId: string) {
    const [updated] = await db.update(users).set({ role: role as any, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    await this.logAction(adminId, "user_role_update", { userId, role });
    return updated;
  }

  // ─── Model Management ───
  async listModelApplications(status?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [];
    if (status) conditions.push(eq(modelApplications.status, status as any));

    const results = await db
      .select()
      .from(modelApplications)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(modelApplications.submittedAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async approveModelApplication(applicationId: string, adminId: string) {
    const [app] = await db.select().from(modelApplications).where(eq(modelApplications.id, applicationId)).limit(1);
    if (!app) throw new Error("Application not found");

    await db.update(modelApplications).set({ status: "APPROVED" as any, reviewedByAdminId: adminId, reviewedAt: new Date() }).where(eq(modelApplications.id, applicationId));
    await db.insert(models).values({ userId: app.userId, approvedAt: new Date(), approvedByAdminId: adminId } as any).onConflictDoNothing();
    await db.update(users).set({ role: "MODEL" as any }).where(eq(users.id, app.userId));

    await this.logAction(adminId, "model_application_approve", { applicationId, userId: app.userId });
    return { success: true };
  }

  async rejectModelApplication(applicationId: string, reason: string, adminId: string) {
    await db.update(modelApplications).set({ status: "REJECTED" as any, rejectionReason: reason, reviewedByAdminId: adminId, reviewedAt: new Date() }).where(eq(modelApplications.id, applicationId));
    await this.logAction(adminId, "model_application_reject", { applicationId, reason });
    return { success: true };
  }

  // ─── Financial Management ───
  async getFinancialOverview(startDate: Date, endDate: Date) {
    const totalRevenue = await db.select({ total: sum(payments.amountUsd) }).from(payments).where(and(eq(payments.status, "COMPLETED" as any), between(payments.createdAt, startDate, endDate)));
    const totalWithdrawals = await db.select({ total: sum(withdrawRequests.totalPayoutAmount) }).from(withdrawRequests).where(and(eq(withdrawRequests.status, "COMPLETED" as any), between(withdrawRequests.createdAt, startDate, endDate)));
    const pendingWithdrawals = await db.select({ total: sum(withdrawRequests.totalPayoutAmount), count: count() }).from(withdrawRequests).where(eq(withdrawRequests.status, "PENDING" as any));
    const giftRevenue = await db.select({ total: sum(giftTransactions.coinCost) }).from(giftTransactions).where(between(giftTransactions.createdAt, startDate, endDate));

    return {
      totalRevenue: Number(totalRevenue[0]?.total ?? 0),
      totalWithdrawals: Number(totalWithdrawals[0]?.total ?? 0),
      pendingWithdrawals: { amount: Number(pendingWithdrawals[0]?.total ?? 0), count: Number(pendingWithdrawals[0]?.count ?? 0) },
      giftRevenue: Number(giftRevenue[0]?.total ?? 0),
    };
  }

  async listWithdrawRequests(status?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [];
    if (status) conditions.push(eq(withdrawRequests.status, status as any));

    const results = await db.select().from(withdrawRequests).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(withdrawRequests.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async processWithdrawRequest(requestId: string, action: "approve" | "reject", adminId: string, reason?: string) {
    if (action === "approve") {
      await db.update(withdrawRequests).set({ status: "APPROVED" as any, approvedByAdminId: adminId, approvedAt: new Date() }).where(eq(withdrawRequests.id, requestId));
    } else {
      await db.update(withdrawRequests).set({ status: "REJECTED" as any, rejectionReason: reason ?? "" }).where(eq(withdrawRequests.id, requestId));
    }
    await this.logAction(adminId, `withdraw_${action}`, { requestId, reason });
    return { success: true };
  }

  // ─── Gift Management ───
  async listGifts() {
    return db.select().from(gifts).orderBy(asc(gifts.displayOrder));
  }

  async createGift(data: { name: string; iconUrl: string; coinPrice: number; category: string; effectTier: string; displayOrder?: number }, adminId: string) {
    const [gift] = await db.insert(gifts).values({ ...data, createdByAdminId: adminId } as any).returning();
    if (!gift) throw new Error("Failed to create gift");
    await this.logAction(adminId, "gift_create", { giftId: gift.id });
    return gift;
  }

  async updateGift(giftId: string, data: Record<string, any>, adminId: string) {
    const [updated] = await db.update(gifts).set({ ...data, updatedAt: new Date() }).where(eq(gifts.id, giftId)).returning();
    await this.logAction(adminId, "gift_update", { giftId });
    return updated;
  }

  // ─── VIP Management ───
  async listVipSubscriptions(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(vipSubscriptions).orderBy(desc(vipSubscriptions.currentPeriodStart)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── Agency Management ───
  async listAgencies(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(agencies).orderBy(desc(agencies.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async approveAgency(agencyId: string, adminId: string) {
    await db.update(agencies).set({ status: "ACTIVE" as any }).where(eq(agencies.id, agencyId));
    await this.logAction(adminId, "agency_approve", { agencyId });
    return { success: true };
  }

  // ─── Moderation ───
  async listFraudFlags(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(fraudFlags).orderBy(desc(fraudFlags.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async resolveFraudFlag(flagId: string, action: string, adminId: string) {
    await db.update(fraudFlags).set({ status: "RESOLVED" as any, actionTaken: action, resolvedAt: new Date() }).where(eq(fraudFlags.id, flagId));
    await this.logAction(adminId, "fraud_flag_resolve", { flagId, action });
    return { success: true };
  }

  async listMediaScanResults(status?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [];
    if (status) conditions.push(eq(mediaScanResults.scanStatus, status as any));

    const results = await db.select().from(mediaScanResults).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(mediaScanResults.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── System Settings ───
  async getSystemSettings() {
    return db.select().from(systemSettings).orderBy(asc(systemSettings.key));
  }

  async upsertSystemSetting(key: string, value: any, adminId: string) {
    const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    let result;
    if (existing) {
      [result] = await db.update(systemSettings).set({ valueJson: value, updatedAt: new Date(), updatedByAdminId: adminId }).where(eq(systemSettings.id, existing.id)).returning();
    } else {
      [result] = await db.insert(systemSettings).values({ key, valueJson: value, updatedByAdminId: adminId } as any).returning();
    }
    await cacheDel(`settings:${key}`);
    await this.logAction(adminId, "system_setting_update", { key });
    return result;
  }

  // ─── Feature Flags ───
  async listFeatureFlags() {
    return db.select().from(featureFlags).orderBy(asc(featureFlags.flagKey));
  }

  async upsertFeatureFlag(key: string, flagType: string, enabled: boolean, adminId?: string) {
    const [existing] = await db.select().from(featureFlags).where(eq(featureFlags.flagKey, key)).limit(1);
    let result;
    if (existing) {
      [result] = await db.update(featureFlags).set({ flagType: flagType as any, enabled, updatedAt: new Date() }).where(eq(featureFlags.id, existing.id)).returning();
    } else {
      [result] = await db.insert(featureFlags).values({ flagKey: key, flagType: flagType as any, enabled, createdByAdminId: adminId } as any).returning();
    }
    await cacheDel(`feature_flag:${key}`);
    if (adminId) await this.logAction(adminId, "feature_flag_update", { key, enabled });
    return result;
  }

  // ─── UI / CMS ───
  async listHomepageSections() {
    return db.select().from(homepageSections).orderBy(asc(homepageSections.position));
  }

  async upsertHomepageSection(data: { id?: string; sectionType: string; position: number; status: string; configJson?: any }, adminId: string) {
    if (data.id) {
      const [updated] = await db.update(homepageSections).set({ sectionType: data.sectionType as any, position: data.position, status: data.status as any, configJson: data.configJson, updatedAt: new Date() }).where(eq(homepageSections.id, data.id)).returning();
      return updated;
    }
    const [created] = await db.insert(homepageSections).values({ sectionType: data.sectionType as any, position: data.position, status: data.status as any, configJson: data.configJson ?? {}, createdByAdminId: adminId } as any).returning();
    return created;
  }

  async listUiLayoutConfigs() {
    return db.select().from(uiLayoutConfigs).orderBy(asc(uiLayoutConfigs.layoutName));
  }

  async upsertUiLayoutConfig(layoutName: string, sectionsJson: any, adminId: string) {
    const [existing] = await db.select().from(uiLayoutConfigs).where(eq(uiLayoutConfigs.layoutName, layoutName)).limit(1);
    let result;
    if (existing) {
      [result] = await db.update(uiLayoutConfigs).set({ sectionsJson, updatedAt: new Date() }).where(eq(uiLayoutConfigs.id, existing.id)).returning();
    } else {
      [result] = await db.insert(uiLayoutConfigs).values({ layoutName, sectionsJson, publishedByAdminId: adminId } as any).returning();
    }
    await this.logAction(adminId, "ui_layout_update", { layoutName });
    return result;
  }

  // ─── Notification Campaigns ───
  async listNotificationCampaigns(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(notificationCampaigns).orderBy(desc(notificationCampaigns.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async createNotificationCampaign(data: { name: string; campaignType: string; segmentRuleJson?: any; scheduledAt?: Date }, adminId: string) {
    const [campaign] = await db.insert(notificationCampaigns).values({ ...data, status: "DRAFT" as any, createdByAdminId: adminId } as any).returning();
    if (!campaign) throw new Error("Failed to create campaign");
    await this.logAction(adminId, "notification_campaign_create", { campaignId: campaign.id });
    return campaign;
  }

  // ─── Call Pricing Rules ───
  async listCallPricingRules() {
    return db.select().from(callPricingRules).orderBy(asc(callPricingRules.createdAt));
  }

  async upsertCallPricingRule(data: Record<string, any>, adminId: string) {
    if (data.id) {
      const [updated] = await db.update(callPricingRules).set({ ...data, updatedAt: new Date() }).where(eq(callPricingRules.id, data.id)).returning();
      await this.logAction(adminId, "pricing_rule_update", { ruleId: data.id });
      return updated;
    }
    const [created] = await db.insert(callPricingRules).values({ ...data, createdByAdminId: adminId } as any).returning();
    if (!created) throw new Error("Failed to create pricing rule");
    await this.logAction(adminId, "pricing_rule_create", { ruleId: created.id });
    return created;
  }

  // ─── Model Level Rules ───
  async listModelLevelRules() {
    return db.select().from(modelLevelRules).orderBy(asc(modelLevelRules.levelNumber));
  }

  async upsertModelLevelRule(data: Record<string, any>, adminId: string) {
    if (data.id) {
      const [updated] = await db.update(modelLevelRules).set({ ...data, updatedAt: new Date() }).where(eq(modelLevelRules.id, data.id)).returning();
      return updated;
    }
    const [created] = await db.insert(modelLevelRules).values({ ...data, createdByAdminId: adminId } as any).returning();
    if (!created) throw new Error("Failed to create level rule");
    await this.logAction(adminId, "level_rule_create", { ruleId: created.id });
    return created;
  }

  // ─── DM Management ───
  async listDmConversations(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(dmConversations).orderBy(desc(dmConversations.updatedAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── Group Audio Management ───
  async listGroupAudioRooms(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(groupAudioRooms).orderBy(desc(groupAudioRooms.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── Party Room Management ───
  async listPartyRooms(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(partyRooms).orderBy(desc(partyRooms.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── PK Management ───
  async listPkSessions(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(pkSessions).orderBy(desc(pkSessions.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── Cache Management ───
  async clearCache(pattern: string, adminId: string) {
    await cacheDel(pattern);
    await this.logAction(adminId, "cache_clear", { pattern });
    return { success: true };
  }

  // ─── Admin Audit Log ───
  async getAuditLog(cursor?: string, limit = 50) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── Dashboard Stats ───
  async getDashboardStats() {
    const totalUsers = await db.select({ count: count() }).from(users);
    const totalModels = await db.select({ count: count() }).from(models).where(isNotNull(models.approvedAt));
    const activeStreams = await db.select({ count: count() }).from(liveRooms).where(eq(liveRooms.status, "LIVE" as any));
    const activeCalls = await db.select({ count: count() }).from(callSessions).where(eq(callSessions.status, "ACTIVE" as any));
    const activeGroupAudio = await db.select({ count: count() }).from(groupAudioRooms).where(eq(groupAudioRooms.status, "LIVE" as any));
    const activeParty = await db.select({ count: count() }).from(partyRooms).where(eq(partyRooms.status, "ACTIVE" as any));

    return {
      totalUsers: Number(totalUsers[0]?.count ?? 0),
      totalModels: Number(totalModels[0]?.count ?? 0),
      activeStreams: Number(activeStreams[0]?.count ?? 0),
      activeCalls: Number(activeCalls[0]?.count ?? 0),
      activeGroupAudioRooms: Number(activeGroupAudio[0]?.count ?? 0),
      activePartyRooms: Number(activeParty[0]?.count ?? 0),
    };
  }

  private async logAction(adminId: string, action: string, details: Record<string, any>) {
    const targetId = details.userId ?? details.giftId ?? details.ruleId ?? details.campaignId ?? details.flagId ?? details.requestId ?? details.agencyId ?? details.applicationId ?? null;
    const targetType = details.userId ? "USER" : details.giftId ? "GIFT" : details.ruleId ? "RULE" : details.campaignId ? "CAMPAIGN" : details.flagId ? "FRAUD_FLAG" : details.requestId ? "WITHDRAWAL" : details.agencyId ? "AGENCY" : details.applicationId ? "APPLICATION" : "SYSTEM";
    await db.insert(adminLogs).values({
      adminId,
      action: action as any,
      targetType,
      targetId: targetId ?? adminId,
      reason: JSON.stringify(details),
      ipAddress: "system",
      userAgent: "admin-api",
    });
  }
}
