import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  users, profiles, models, modelApplications, wallets,
  coinTransactions, diamondTransactions, payments, withdrawRequests,
  gifts, giftTransactions, vipSubscriptions, agencies, agencyHosts,
  adminLogs, admins, systemSettings, featureFlags,
  uiLayoutConfigs, uiLayouts, uiComponents, componentPositions, homepageSections,
  liveRooms, callSessions, chatSessions,
  mediaScanResults, fraudFlags, reports, bans, levels,
  campaigns, banners, themes, promotions, badges,
  modelLevelRules, callPricingRules, securityIncidents,
  modelCallStats, modelStats,
  groupAudioRooms, partyRooms,
  dmConversations, dmMessages, notificationCampaigns, agencyApplications,
  agencyCommissionRecords,
} from "@missu/db/schema";
import { PkService } from "../pk/pk.service";
import { WalletService } from "../wallet/wallet.service";
import { PaymentService } from "../payments/payment.service";
import { AgencyService } from "../agencies/agency.service";
import { ReferralService } from "../referrals/referral.service";
import { ComplianceService } from "../compliance/compliance.service";
import { NotificationService } from "../notifications/notification.service";
import { SecurityService } from "../security/security.service";
import { EventService } from "../events/event.service";
import { CampaignService } from "../campaigns/campaign.service";
import { ModelService } from "../models/model.service";
import { eq, and, desc, asc, count, sum, between, like, isNull, isNotNull, or, sql } from "drizzle-orm";
import { decodeCursor, encodeCursor, generateIdempotencyKey } from "@missu/utils";
import { cacheDel, getRedis } from "@missu/utils";

function buildGiftCode(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "GIFT";
}

@Injectable()
export class AdminService {
  private adminUserSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private adminModelSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private adminLogSchemaModePromise: Promise<"modern" | "legacy"> | null = null;

  constructor(
    private readonly pkService: PkService,
    private readonly walletService: WalletService,
    private readonly paymentService: PaymentService,
    private readonly agencyService: AgencyService,
    private readonly referralService: ReferralService,
    private readonly complianceService: ComplianceService,
    private readonly notificationService: NotificationService,
    private readonly securityService: SecurityService,
    private readonly eventService: EventService,
    private readonly campaignService: CampaignService,
    private readonly modelService: ModelService,
  ) {}

  private async getAdminUserSchemaMode() {
    if (!this.adminUserSchemaModePromise) {
      this.adminUserSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'users'
            and column_name = 'status'
        ) as has_status
      `).then((result) => {
        const value = result.rows[0] as { has_status?: boolean | string | number } | undefined;
        return value?.has_status ? "modern" : "legacy";
      });
    }

    return this.adminUserSchemaModePromise;
  }

  private async getAdminModelSchemaMode() {
    if (!this.adminModelSchemaModePromise) {
      this.adminModelSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'models'
        ) as has_models
      `).then((result) => {
        const value = result.rows[0] as { has_models?: boolean | string | number } | undefined;
        return value?.has_models ? "modern" : "legacy";
      });
    }

    return this.adminModelSchemaModePromise;
  }

  private async getAdminLogSchemaMode() {
    if (!this.adminLogSchemaModePromise) {
      this.adminLogSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'admin_logs'
            and column_name = 'admin_id'
        ) as has_admin_id
      `).then((result) => {
        const value = result.rows[0] as { has_admin_id?: boolean | string | number } | undefined;
        return value?.has_admin_id ? "modern" : "legacy";
      });
    }

    return this.adminLogSchemaModePromise;
  }

  // ─── User Management ───
  async listUsers(cursor?: string, limit = 20, search?: string) {
    if (await this.getAdminUserSchemaMode() === "legacy") {
      const offset = cursor ? decodeCursor(cursor) : 0;
      const results = await db.execute(sql`
        select
          u.id,
          u.email,
          u.role,
          case
            when u.is_banned then 'BANNED'
            when u.is_suspended then 'SUSPENDED'
            else 'ACTIVE'
          end as status,
          coalesce(p.display_name, u.username) as "displayName",
          p.avatar_url as "avatarUrl",
          u.created_at as "createdAt"
        from users u
        left join profiles p on p.user_id = u.id
        where (${search
          ? sql`coalesce(p.display_name, u.username, '') ilike ${`%${search}%`}
              or coalesce(u.username, '') ilike ${`%${search}%`}
              or coalesce(u.email, '') ilike ${`%${search}%`}`
          : sql`true`})
        order by u.created_at desc
        limit ${limit + 1}
        offset ${offset}
      `);

      const rows = results.rows as Array<Record<string, unknown>>;
      const hasMore = rows.length > limit;
      return {
        items: hasMore ? rows.slice(0, limit) : rows,
        nextCursor: hasMore ? encodeCursor(offset + limit) : null,
      };
    }

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
    if (await this.getAdminUserSchemaMode() === "legacy") {
      const normalized = status.trim().toUpperCase();
      const isBanned = normalized === "BANNED";
      const isSuspended = normalized === "SUSPENDED";
      const result = await db.execute(sql`
        update users
        set
          is_banned = ${isBanned},
          is_suspended = ${isSuspended},
          updated_at = now()
        where id = ${userId}::uuid
        returning *
      `);
      const updated = result.rows[0] ?? null;
      await this.logAction(adminId, "user_status_update", { userId, status: normalized });
      return updated;
    }

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
    if (await this.getAdminModelSchemaMode() === "modern") {
      await db.insert(models).values({ userId: app.userId, approvedAt: new Date(), approvedByAdminId: adminId } as any).onConflictDoNothing();
    }
    await db.update(users).set({ role: "MODEL" as any }).where(eq(users.id, app.userId));

    await this.logAction(adminId, "model_application_approve", { applicationId, userId: app.userId });
    return { success: true };
  }

  async rejectModelApplication(applicationId: string, reason: string, adminId: string) {
    await db.update(modelApplications).set({ status: "REJECTED" as any, rejectionReason: reason, reviewedByAdminId: adminId, reviewedAt: new Date() }).where(eq(modelApplications.id, applicationId));
    await this.logAction(adminId, "model_application_reject", { applicationId, reason });
    return { success: true };
  }

  async listModels(status?: string, cursor?: string, limit = 20) {
    if (await this.getAdminModelSchemaMode() === "legacy") {
      const offset = cursor ? decodeCursor(cursor) : 0;
      const normalizedStatus = status?.trim().toUpperCase();
      const results = await db.execute(sql`
        select
          u.id,
          u.id as "modelId",
          coalesce(p.display_name, u.username) as "displayName",
          coalesce(mcs.audio_minutes_total, 0) as "totalAudioMinutes",
          coalesce(mcs.video_minutes_total, 0) as "totalVideoMinutes",
          coalesce(p.level, 1) as level,
          case
            when u.is_banned then 'BANNED'
            when u.is_suspended then 'SUSPENDED'
            else 'ACTIVE'
          end as status,
          false as "isOnline",
          coalesce(v.demo_video_count, 0) as "demoVideoCount",
          u.created_at as "createdAt"
        from users u
        left join profiles p on p.user_id = u.id
        left join model_call_stats mcs on mcs.model_user_id = u.id
        left join (
          select user_id, count(*)::int as demo_video_count
          from model_demo_videos
          where is_active = true
          group by user_id
        ) v on v.user_id = u.id
        where u.role = 'MODEL'
          ${normalizedStatus === "ACTIVE" ? sql`and not u.is_banned and not u.is_suspended` : sql``}
          ${normalizedStatus === "SUSPENDED" ? sql`and u.is_suspended = true and u.is_banned = false` : sql``}
          ${normalizedStatus === "BANNED" ? sql`and u.is_banned = true` : sql``}
        order by u.created_at desc
        limit ${limit + 1}
        offset ${offset}
      `);

      const rows = results.rows as Array<Record<string, unknown>>;
      const items = await Promise.all(
        rows.slice(0, limit).map(async (row) => {
          const [pendingPayout] = await db
            .select({ total: sum(withdrawRequests.totalPayoutAmount) })
            .from(withdrawRequests)
            .where(and(eq(withdrawRequests.modelUserId, String(row.id)), eq(withdrawRequests.status, "PENDING" as any)));

          return {
            ...row,
            pendingPayout: Number(pendingPayout?.total ?? 0),
          };
        }),
      );

      const hasMore = rows.length > limit;
      return { models: items, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
    }

    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [isNotNull(models.approvedAt)];

    if (status) {
      if (status.toLowerCase() === "active") {
        conditions.push(eq(users.status, "ACTIVE" as any));
      } else if (status.toLowerCase() === "suspended") {
        conditions.push(or(eq(users.status, "SUSPENDED" as any), eq(users.status, "BANNED" as any)));
      } else {
        conditions.push(eq(users.status, status.toUpperCase() as any));
      }
    }

    const results = await db
      .select({
        id: models.userId,
        modelId: models.id,
        displayName: users.displayName,
        totalAudioMinutes: modelCallStats.audioMinutesTotal,
        totalVideoMinutes: modelCallStats.videoMinutesTotal,
        level: modelStats.currentLevel,
        status: users.status,
        isOnline: models.isOnline,
        demoVideoCount: models.demoVideoCount,
        createdAt: models.createdAt,
      })
      .from(models)
      .innerJoin(users, eq(users.id, models.userId))
      .leftJoin(modelCallStats, eq(modelCallStats.modelUserId, models.userId))
      .leftJoin(modelStats, eq(modelStats.modelUserId, models.userId))
      .where(and(...conditions))
      .orderBy(desc(models.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const items = await Promise.all(
      results.slice(0, limit).map(async (row) => {
        const [pendingPayout] = await db
          .select({ total: sum(withdrawRequests.totalPayoutAmount) })
          .from(withdrawRequests)
          .where(and(eq(withdrawRequests.modelUserId, row.id), eq(withdrawRequests.status, "PENDING" as any)));

        return {
          ...row,
          pendingPayout: Number(pendingPayout?.total ?? 0),
        };
      }),
    );

    const hasMore = results.length > limit;
    return { models: items, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── Financial Management ───
  async getFinancialOverview(startDate: Date, endDate: Date) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setMonth(monthStart.getMonth() - 1);

    const [totalRevenue, totalWithdrawals, pendingWithdrawals, giftRevenue, monthRevenue, weekRevenue, todayRevenue] = await Promise.all([
      db.select({ total: sum(payments.amountUsd) }).from(payments).where(and(eq(payments.status, "COMPLETED" as any), between(payments.createdAt, startDate, endDate))),
      db.select({ total: sum(withdrawRequests.totalPayoutAmount) }).from(withdrawRequests).where(and(eq(withdrawRequests.status, "COMPLETED" as any), between(withdrawRequests.createdAt, startDate, endDate))),
      db.select({ total: sum(withdrawRequests.totalPayoutAmount), count: count() }).from(withdrawRequests).where(eq(withdrawRequests.status, "PENDING" as any)),
      db.select({ total: sum(giftTransactions.coinCost) }).from(giftTransactions).where(between(giftTransactions.createdAt, startDate, endDate)),
      db.select({ total: sum(payments.amountUsd) }).from(payments).where(and(eq(payments.status, "COMPLETED" as any), between(payments.createdAt, monthStart, now))),
      db.select({ total: sum(payments.amountUsd) }).from(payments).where(and(eq(payments.status, "COMPLETED" as any), between(payments.createdAt, weekStart, now))),
      db.select({ total: sum(payments.amountUsd) }).from(payments).where(and(eq(payments.status, "COMPLETED" as any), between(payments.createdAt, todayStart, now))),
    ]);

    return {
      totalRevenue: Number(totalRevenue[0]?.total ?? 0),
      totalWithdrawals: Number(totalWithdrawals[0]?.total ?? 0),
      pendingWithdrawals: { amount: Number(pendingWithdrawals[0]?.total ?? 0), count: Number(pendingWithdrawals[0]?.count ?? 0) },
      giftRevenue: Number(giftRevenue[0]?.total ?? 0),
      monthRevenue: Number(monthRevenue[0]?.total ?? 0),
      weekRevenue: Number(weekRevenue[0]?.total ?? 0),
      todayRevenue: Number(todayRevenue[0]?.total ?? 0),
      pendingPayouts: Number(pendingWithdrawals[0]?.total ?? 0),
      payoutCount: Number(pendingWithdrawals[0]?.count ?? 0),
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
    const [request] = await db.select().from(withdrawRequests).where(eq(withdrawRequests.id, requestId)).limit(1);
    if (!request) throw new Error("Withdraw request not found");

    const isCreatorOnlyWithdrawal = Number(request.audioMinutesSnapshot ?? 0) === 0
      && Number(request.videoMinutesSnapshot ?? 0) === 0
      && Number(request.callEarningsSnapshot ?? 0) === 0
      && Number(request.diamondBalanceSnapshot ?? 0) > 0;

    if (action === "approve") {
      await db
        .update(withdrawRequests)
        .set({
          status: (isCreatorOnlyWithdrawal ? "COMPLETED" : "APPROVED") as any,
          approvedByAdminId: adminId,
          approvedAt: new Date(),
          completedAt: isCreatorOnlyWithdrawal ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(withdrawRequests.id, requestId));

      if (isCreatorOnlyWithdrawal) {
        await db
          .update(wallets)
          .set({
            lifetimeDiamondsWithdrawn: sql`${wallets.lifetimeDiamondsWithdrawn} + ${Number(request.diamondBalanceSnapshot ?? 0)}`,
            updatedAt: new Date(),
          } as any)
          .where(eq(wallets.userId, request.modelUserId));
      }
    } else {
      await db.update(withdrawRequests).set({ status: "REJECTED" as any, rejectionReason: reason ?? "", updatedAt: new Date() }).where(eq(withdrawRequests.id, requestId));
      if (Number(request.diamondBalanceSnapshot ?? 0) > 0) {
        await this.walletService.creditDiamonds(
          request.modelUserId,
          Number(request.diamondBalanceSnapshot ?? 0),
          "ADMIN_ADJUSTMENT",
          request.id,
          "Withdrawal request rejected refund",
          generateIdempotencyKey(request.modelUserId, "withdrawal_refund", request.id),
        );
      }
    }
    await this.logAction(adminId, `withdraw_${action}`, { requestId, reason });
    return { success: true };
  }

  async listPayments(cursor?: string, limit = 20, userId?: string, status?: string) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [];
    if (userId) conditions.push(eq(payments.userId, userId));
    if (status) conditions.push(eq(payments.status, status as any));
    const results = await db
      .select()
      .from(payments)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(limit + 1)
      .offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async getPaymentDetail(paymentId: string) {
    return this.paymentService.getPaymentDetail(paymentId);
  }

  async listWebhookEvents(cursor?: string, limit = 50) {
    return this.paymentService.listWebhookEvents(cursor, limit);
  }

  async listPaymentDisputes(cursor?: string, limit = 50, status?: string) {
    return this.paymentService.listPaymentDisputes(cursor, limit, status);
  }

  async openPaymentDispute(
    paymentId: string,
    providerDisputeId: string,
    disputeReason: string,
    amountUsd: number | null,
    metadataJson: Record<string, unknown> | undefined,
    adminId: string,
  ) {
    const dispute = await this.paymentService.openPaymentDispute(
      paymentId,
      providerDisputeId,
      disputeReason,
      amountUsd,
      metadataJson,
      adminId,
    );
    await this.logAction(adminId, "payment_dispute_open", { paymentId, disputeId: dispute.id });
    return dispute;
  }

  async resolvePaymentDispute(disputeId: string, status: "UNDER_REVIEW" | "WON" | "LOST" | "RESOLVED", resolutionNotes: string | undefined, adminId: string) {
    const dispute = await this.paymentService.resolvePaymentDispute(disputeId, status, resolutionNotes);
    await this.logAction(adminId, "payment_dispute_resolve", { disputeId, status });
    return dispute;
  }

  async createRefund(paymentId: string, amountUsd: number | null, idempotencyKey: string | undefined, adminId: string) {
    const result = await this.paymentService.createRefund(paymentId, amountUsd, idempotencyKey, adminId);
    await this.logAction(adminId, "payment_refund", { paymentId, amountUsd });
    return result;
  }

  async updatePaymentStatus(paymentId: string, status: string, adminId: string) {
    const [updated] = await db.update(payments).set({ status: status as any, updatedAt: new Date() }).where(eq(payments.id, paymentId)).returning();
    await this.logAction(adminId, "payment_status_update", { paymentId, status });
    return updated;
  }

  async listLedgerMismatches(limit = 100) {
    return this.walletService.listLedgerMismatches(limit);
  }

  async runPaymentReconciliation(limit = 500) {
    return this.paymentService.runPaymentReconciliation(limit);
  }

  // ─── Gift Management ───
  async listGifts() {
    return db.select().from(gifts).orderBy(asc(gifts.displayOrder));
  }

  async createGift(
    data: {
      name: string;
      iconUrl: string;
      coinPrice: number;
      diamondCredit: number;
      category: string;
      effectTier: string;
      displayOrder?: number;
      supportedContexts?: string[];
      isActive?: boolean;
    },
    adminId: string,
  ) {
    const [gift] = await db.insert(gifts).values({
      giftCode: buildGiftCode(data.name),
      name: data.name,
      iconUrl: data.iconUrl,
      coinPrice: data.coinPrice,
      diamondCredit: data.diamondCredit,
      category: data.category,
      effectTier: data.effectTier as any,
      supportedContextsJson: data.supportedContexts ?? [
        "LIVE_STREAM",
        "VIDEO_CALL",
        "VOICE_CALL",
        "CHAT_CONVERSATION",
        "PK_BATTLE",
        "GROUP_AUDIO",
        "PARTY",
      ],
      isActive: data.isActive ?? true,
      displayOrder: data.displayOrder ?? 0,
      createdByAdminId: adminId,
    } as any).returning();
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

  // --- Referral Management ---
  async getReferralOverview(limit = 25) {
    return this.referralService.getReferralOverview(limit);
  }

  // --- Event Management ---
  async listEvents(status?: string, cursor?: string, limit = 20) {
    return this.eventService.listAdminEvents(status, cursor, limit);
  }

  async createEvent(
    data: {
      title: string;
      description: string;
      eventType: string;
      startDate: Date;
      endDate: Date;
      rulesJson?: unknown;
      rewardPoolJson?: unknown;
    },
    adminId: string,
  ) {
    const event = await this.eventService.createEvent(data, adminId);
    await this.logAction(adminId, "event_create", { eventId: event?.id });
    return event;
  }

  async updateEvent(eventId: string, data: Record<string, unknown>, adminId: string) {
    const event = await this.eventService.updateEvent(eventId, data);
    await this.logAction(adminId, "event_update", { eventId });
    return event;
  }

  async getEventAnalytics(eventId: string) {
    return this.eventService.getEventAnalytics(eventId);
  }

  async distributeEventRewards(eventId: string, adminId: string) {
    const result = await this.eventService.distributeEventRewards(eventId);
    await this.logAction(adminId, "event_rewards_distribute", { eventId, grantedCount: result.grantedCount });
    return result;
  }

  // --- Campaign Management ---
  async listCampaigns(status?: string, cursor?: string, limit = 20) {
    return this.campaignService.listCampaigns(status, cursor, limit);
  }

  async upsertCampaign(
    input: {
      campaignId?: string;
      name: string;
      campaignType: string;
      startAt: Date;
      endAt: Date;
      status?: string;
      segmentRuleJson?: unknown;
      rewardRuleJson?: unknown;
      budgetLimitJson?: unknown;
    },
    adminId: string,
  ) {
    const campaign = await this.campaignService.upsertCampaign(input, adminId);
    await this.logAction(adminId, input.campaignId ? "campaign_update" : "campaign_create", { campaignId: campaign?.id });
    return campaign;
  }

  async getCampaignAnalytics(campaignId?: string) {
    return this.campaignService.getCampaignAnalytics(campaignId);
  }

  async distributeCampaignRewards(campaignId: string, adminId: string, limit = 200) {
    const result = await this.campaignService.distributeCampaignRewards(campaignId, limit);
    await this.logAction(adminId, "campaign_rewards_distribute", { campaignId, grantedCount: result.grantedCount });
    return result;
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

  async listAgencyApplications(status?: string, cursor?: string, limit = 20) {
    return this.agencyService.listAgencyApplications(status, cursor, limit);
  }

  async approveAgencyApplication(applicationId: string, adminId: string) {
    const result = await this.agencyService.approveAgencyApplication(applicationId, adminId);
    await this.logAction(adminId, "agency_application_approve", { applicationId, agencyId: result.agency.id });
    return result;
  }

  async rejectAgencyApplication(applicationId: string, adminId: string, notes?: string) {
    const result = await this.agencyService.rejectAgencyApplication(applicationId, adminId, notes);
    await this.logAction(adminId, "agency_application_reject", { applicationId });
    return result;
  }

  async listAgencyCommissionRecords(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db
      .select()
      .from(agencyCommissionRecords)
      .orderBy(desc(agencyCommissionRecords.createdAt))
      .limit(limit + 1)
      .offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async getModelAvailability(modelUserId: string) {
    return this.modelService.getAvailabilitySummary(modelUserId);
  }

  async overrideModelAvailability(modelUserId: string, isOnline: boolean, adminId: string) {
    const result = await this.modelService.setOnlineOverride(modelUserId, isOnline);
    await this.logAction(adminId, "model_availability_override", { modelUserId, isOnline });
    return result;
  }

  async listModelDemoVideos(modelUserId: string, status?: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED") {
    return this.modelService.getDemoVideos(modelUserId, status);
  }

  async reviewModelDemoVideo(
    demoVideoId: string,
    status: "APPROVED" | "REJECTED" | "ARCHIVED",
    adminId: string,
    rejectionReason?: string,
  ) {
    const video = await this.modelService.reviewDemoVideo(demoVideoId, status, adminId, rejectionReason);
    await this.logAction(adminId, "model_demo_video_review", { demoVideoId, status });
    return video;
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

  async listReports(status?: string, entityType?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [];
    if (status) conditions.push(eq(reports.status, status as any));
    if (entityType) conditions.push(eq(reports.entityType, entityType as any));

    const results = await db
      .select()
      .from(reports)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(reports.priorityScore), desc(reports.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const reporterIds = Array.from(new Set(items.map((item) => item.reporterUserId)));
    const reviewerAdminIds = Array.from(new Set(items.map((item) => item.reviewedByAdminId).filter(Boolean))) as string[];

    const reporterRows = reporterIds.length
      ? await this.getAdminUserSchemaMode().then((mode) => mode === "legacy"
        ? this.fetchLegacyAdminUsers(reporterIds)
        : db
            .select({ id: users.id, displayName: users.displayName, email: users.email, avatarUrl: users.avatarUrl, status: users.status })
            .from(users)
            .where(sql`${users.id} = ANY(${reporterIds})`))
      : [];

    const reviewerRows = reviewerAdminIds.length
      ? await db
          .select({ id: admins.id, userId: admins.userId })
          .from(admins)
          .where(sql`${admins.id} = ANY(${reviewerAdminIds})`)
      : [];

    const reviewerUserIds = Array.from(new Set(reviewerRows.map((item) => item.userId).filter(Boolean))) as string[];
    const reviewerUsers = reviewerUserIds.length
      ? await this.getAdminUserSchemaMode().then((mode) => mode === "legacy"
        ? this.fetchLegacyAdminUsers(reviewerUserIds)
        : db
            .select({ id: users.id, displayName: users.displayName, email: users.email })
            .from(users)
            .where(sql`${users.id} = ANY(${reviewerUserIds})`))
      : [];

    const reporterMap = new Map(reporterRows.map((item) => [item.id, item]));
    const reviewerAdminMap = new Map(reviewerRows.map((item) => [item.id, item]));
    const reviewerUserMap = new Map(reviewerUsers.map((item) => [item.id, item]));

    return {
      items: items.map((item) => {
        const reviewerAdmin = item.reviewedByAdminId ? reviewerAdminMap.get(item.reviewedByAdminId) : null;
        const reviewerUser = reviewerAdmin?.userId ? reviewerUserMap.get(reviewerAdmin.userId) : null;

        return {
          ...item,
          reporter: reporterMap.get(item.reporterUserId) ?? null,
          reviewedBy: reviewerUser
            ? {
                adminId: item.reviewedByAdminId,
                userId: reviewerAdmin?.userId ?? null,
                displayName: reviewerUser.displayName,
                email: reviewerUser.email,
              }
            : null,
        };
      }),
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async reviewReport(reportId: string, status: string, resolutionNotes: string | undefined, adminId: string) {
    const actorAdminId = await this.resolveAdminActorId(adminId);
    const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    if (!report) throw new Error("Report not found");

    const [updated] = await db
      .update(reports)
      .set({
        status: status as any,
        resolutionNotes: resolutionNotes ?? report.resolutionNotes,
        reviewedAt: new Date(),
        reviewedByAdminId: actorAdminId,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    await this.logAction(adminId, "report_review", { reportId, status, entityId: report.entityId, resolutionNotes });
    return updated;
  }

  async listBans(status?: string, scope?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [];
    if (status) conditions.push(eq(bans.status, status as any));
    if (scope) conditions.push(eq(bans.scope, scope as any));

    const results = await db
      .select()
      .from(bans)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(bans.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const userIds = Array.from(new Set(items.map((item) => item.userId)));
    const adminIds = Array.from(new Set(items.flatMap((item) => [item.imposedByAdminId, item.revokedByAdminId]).filter(Boolean))) as string[];
    const sourceReportIds = Array.from(new Set(items.map((item) => item.sourceReportId).filter(Boolean))) as string[];

    const userRows = userIds.length
      ? await this.getAdminUserSchemaMode().then((mode) => mode === "legacy"
        ? this.fetchLegacyAdminUsers(userIds)
        : db
            .select({ id: users.id, displayName: users.displayName, email: users.email, avatarUrl: users.avatarUrl, status: users.status })
            .from(users)
            .where(sql`${users.id} = ANY(${userIds})`))
      : [];

    const adminRows = adminIds.length
      ? await db
          .select({ id: admins.id, userId: admins.userId })
          .from(admins)
          .where(sql`${admins.id} = ANY(${adminIds})`)
      : [];

    const adminUserIds = Array.from(new Set(adminRows.map((item) => item.userId).filter(Boolean))) as string[];
    const adminUsers = adminUserIds.length
      ? await this.getAdminUserSchemaMode().then((mode) => mode === "legacy"
        ? this.fetchLegacyAdminUsers(adminUserIds)
        : db
            .select({ id: users.id, displayName: users.displayName, email: users.email })
            .from(users)
            .where(sql`${users.id} = ANY(${adminUserIds})`))
      : [];

    const reportRows = sourceReportIds.length
      ? await db
          .select({ id: reports.id, reasonCode: reports.reasonCode, status: reports.status, entityType: reports.entityType, entityId: reports.entityId })
          .from(reports)
          .where(sql`${reports.id} = ANY(${sourceReportIds})`)
      : [];

    const userMap = new Map(userRows.map((item) => [item.id, item]));
    const adminMap = new Map(adminRows.map((item) => [item.id, item]));
    const adminUserMap = new Map(adminUsers.map((item) => [item.id, item]));
    const reportMap = new Map(reportRows.map((item) => [item.id, item]));

    return {
      items: items.map((item) => {
        const imposedAdmin = item.imposedByAdminId ? adminMap.get(item.imposedByAdminId) : null;
        const revokedAdmin = item.revokedByAdminId ? adminMap.get(item.revokedByAdminId) : null;

        return {
          ...item,
          user: userMap.get(item.userId) ?? null,
          sourceReport: item.sourceReportId ? reportMap.get(item.sourceReportId) ?? null : null,
          imposedBy: imposedAdmin?.userId ? adminUserMap.get(imposedAdmin.userId) ?? null : null,
          revokedBy: revokedAdmin?.userId ? adminUserMap.get(revokedAdmin.userId) ?? null : null,
        };
      }),
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async imposeBan(input: {
    userId: string;
    scope: string;
    reason: string;
    notes?: string;
    sourceReportId?: string;
    endsAt?: Date | null;
  }, adminId: string) {
    const actorAdminId = await this.resolveAdminActorId(adminId);
    const [existingBan] = await db
      .select({ id: bans.id })
      .from(bans)
      .where(and(eq(bans.userId, input.userId), eq(bans.scope, input.scope as any), eq(bans.status, "ACTIVE" as any)))
      .limit(1);

    if (existingBan) throw new Error("An active ban already exists for this user and scope");

    const [created] = await db
      .insert(bans)
      .values({
        userId: input.userId,
        scope: input.scope as any,
        reason: input.reason as any,
        notes: input.notes,
        sourceReportId: input.sourceReportId,
        imposedByAdminId: actorAdminId,
        endsAt: input.endsAt ?? null,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create ban record");
    }

    if (input.sourceReportId) {
      await db
        .update(reports)
        .set({
          status: "ACTIONED" as any,
          reviewedAt: new Date(),
          reviewedByAdminId: actorAdminId,
          resolutionNotes: input.notes ?? "Ban imposed",
          updatedAt: new Date(),
        })
        .where(eq(reports.id, input.sourceReportId));
    }

    await this.logAction(adminId, "ban_impose", { banId: created.id, userId: input.userId, scope: input.scope, reason: input.reason, sourceReportId: input.sourceReportId });
    return created;
  }

  async revokeBan(banId: string, notes: string | undefined, adminId: string) {
    const actorAdminId = await this.resolveAdminActorId(adminId);
    const [existing] = await db.select().from(bans).where(eq(bans.id, banId)).limit(1);
    if (!existing) throw new Error("Ban not found");

    const [updated] = await db
      .update(bans)
      .set({
        status: "REVOKED" as any,
        notes: notes ?? existing.notes,
        revokedAt: new Date(),
        revokedByAdminId: actorAdminId,
        updatedAt: new Date(),
      })
      .where(eq(bans.id, banId))
      .returning();

    await this.logAction(adminId, "ban_revoke", { banId, userId: existing.userId, notes });
    return updated;
  }

  // ─── System Settings ───
  async getSystemSettings() {
    return db
      .select()
      .from(systemSettings)
      .orderBy(asc(systemSettings.namespace), asc(systemSettings.key), desc(systemSettings.version));
  }

  async upsertSystemSetting(
    input: {
      namespace: string;
      key: string;
      value: unknown;
      environment?: "production" | "staging" | "development";
      regionCode?: string;
      segmentCode?: string;
      status?: "DRAFT" | "PUBLISHED" | "ROLLED_BACK";
      effectiveFrom?: Date;
      effectiveTo?: Date | null;
      changeReason: string;
    },
    adminId: string,
  ) {
    const environment = input.environment ?? ((process.env.NODE_ENV as "production" | "staging" | "development") ?? "development");

    const [latest] = await db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.namespace, input.namespace),
          eq(systemSettings.key, input.key),
          eq(systemSettings.environment, environment),
          input.regionCode ? eq(systemSettings.regionCode, input.regionCode) : isNull(systemSettings.regionCode),
          input.segmentCode ? eq(systemSettings.segmentCode, input.segmentCode) : isNull(systemSettings.segmentCode),
        ),
      )
      .orderBy(desc(systemSettings.version))
      .limit(1);

    const nextVersion = (latest?.version ?? 0) + 1;

    const [created] = await db
      .insert(systemSettings)
      .values({
        namespace: input.namespace,
        key: input.key,
        valueJson: input.value as any,
        environment,
        regionCode: input.regionCode,
        segmentCode: input.segmentCode,
        version: nextVersion,
        status: (input.status ?? "PUBLISHED") as any,
        effectiveFrom: input.effectiveFrom ?? new Date(),
        effectiveTo: input.effectiveTo ?? null,
        changeReason: input.changeReason,
        updatedByAdminId: adminId,
      } as any)
      .returning();

    await cacheDel(`settings:${input.namespace}:${input.key}:${environment}`);
    await this.logAction(adminId, "system_setting_update", {
      namespace: input.namespace,
      key: input.key,
      version: nextVersion,
      environment,
    });
    return created;
  }

  // ─── Feature Flags ───
  async listFeatureFlags() {
    return db.select().from(featureFlags).orderBy(asc(featureFlags.featureName), asc(featureFlags.platform), asc(featureFlags.appVersion));
  }

  async upsertFeatureFlag(
    input: {
      key: string;
      featureName?: string;
      type: "BOOLEAN" | "PERCENTAGE" | "USER_LIST" | "REGION";
      isEnabled: boolean;
      platform?: "ALL" | "MOBILE" | "WEB" | "ANDROID" | "IOS";
      appVersion?: string;
      description?: string;
      value?: unknown;
      percentageValue?: number;
      userIds?: string[];
      regionCodes?: string[];
    },
    adminId?: string,
  ) {
    const platform = input.platform ?? "ALL";
    const appVersion = input.appVersion ?? null;
    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(and(eq(featureFlags.flagKey, input.key), eq(featureFlags.platform, platform as any), appVersion ? eq(featureFlags.appVersion, appVersion) : isNull(featureFlags.appVersion)))
      .limit(1);

    const percentageValue = input.type === "PERCENTAGE"
      ? (input.percentageValue ?? (typeof input.value === "number" ? Number(input.value) : null))
      : null;
    const userIdsJson = input.type === "USER_LIST"
      ? (input.userIds ?? (Array.isArray(input.value) ? input.value : null))
      : null;
    const regionCodesJson = input.type === "REGION"
      ? (input.regionCodes ?? (Array.isArray(input.value) ? input.value : null))
      : null;

    let result;
    if (existing) {
      [result] = await db
        .update(featureFlags)
        .set({
          featureName: input.featureName ?? existing.featureName,
          flagType: input.type as any,
          enabled: input.isEnabled,
          platform: platform as any,
          appVersion,
          description: input.description ?? existing.description,
          percentageValue: percentageValue == null ? null : Math.max(0, Math.min(100, Math.round(percentageValue))),
          userIdsJson: userIdsJson as any,
          regionCodesJson: regionCodesJson as any,
          updatedAt: new Date(),
        })
        .where(eq(featureFlags.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(featureFlags)
        .values({
          flagKey: input.key,
          featureName: input.featureName ?? input.key,
          flagType: input.type as any,
          enabled: input.isEnabled,
          platform: platform as any,
          appVersion,
          description: input.description ?? "",
          percentageValue: percentageValue == null ? null : Math.max(0, Math.min(100, Math.round(percentageValue))),
          userIdsJson: userIdsJson as any,
          regionCodesJson: regionCodesJson as any,
          createdByAdminId: adminId,
        } as any)
        .returning();
    }
      await cacheDel(`feature_flag:${input.key}:${platform}:${appVersion ?? "*"}`);
      if (adminId) await this.logAction(adminId, "feature_flag_update", { key: input.key, enabled: input.isEnabled, type: input.type, platform, appVersion });
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

  async upsertUiLayoutConfig(
    layoutName: string,
    sectionsJson: any,
    adminId: string,
    platform: "MOBILE" | "WEB" | "ALL" = "MOBILE",
  ) {
    const [existing] = await db.select().from(uiLayoutConfigs).where(eq(uiLayoutConfigs.layoutName, layoutName)).limit(1);
    let result;
    if (existing) {
      [result] = await db
        .update(uiLayoutConfigs)
        .set({ sectionsJson, platform: platform as any, status: "PUBLISHED" as any, effectiveFrom: new Date(), updatedAt: new Date() })
        .where(eq(uiLayoutConfigs.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(uiLayoutConfigs)
        .values({
          layoutName,
          sectionsJson,
          platform: platform as any,
          status: "PUBLISHED" as any,
          effectiveFrom: new Date(),
          publishedByAdminId: adminId,
        } as any)
        .returning();
    }
    await this.logAction(adminId, "ui_layout_update", { layoutName });
    return result;
  }

  async listUiLayouts() {
    return db.select().from(uiLayouts).orderBy(asc(uiLayouts.screenKey), asc(uiLayouts.layoutKey), desc(uiLayouts.version));
  }

  async upsertUiLayout(
    input: {
      id?: string;
      layoutKey: string;
      layoutName: string;
      screenKey: string;
      platform?: "MOBILE" | "WEB" | "ALL";
      environment?: string;
      regionCode?: string | null;
      status?: "DRAFT" | "PUBLISHED" | "ROLLED_BACK";
      version?: number;
      tabNavigationJson?: any[];
      metadataJson?: Record<string, any>;
      effectiveFrom?: Date;
      effectiveTo?: Date | null;
    },
    adminId: string,
  ) {
    const environment = input.environment ?? process.env.NODE_ENV ?? "development";
    const payload = {
      layoutKey: input.layoutKey,
      layoutName: input.layoutName,
      screenKey: input.screenKey,
      platform: (input.platform ?? "MOBILE") as any,
      environment,
      regionCode: input.regionCode ?? null,
      version: input.version ?? 1,
      status: (input.status ?? "PUBLISHED") as any,
      tabNavigationJson: input.tabNavigationJson ?? [],
      metadataJson: input.metadataJson ?? {},
      effectiveFrom: input.effectiveFrom ?? new Date(),
      effectiveTo: input.effectiveTo ?? null,
      publishedByAdminId: adminId,
      updatedAt: new Date(),
    };

    if (input.id) {
      const [updated] = await db.update(uiLayouts).set(payload).where(eq(uiLayouts.id, input.id)).returning();
      await this.logAction(adminId, "ui_layout_update", { layoutId: input.id, layoutKey: input.layoutKey });
      return updated;
    }

    const [created] = await db.insert(uiLayouts).values(payload as any).returning();
    if (!created) {
      throw new Error("Failed to create ui layout");
    }
    await this.logAction(adminId, "ui_layout_update", { layoutId: created.id, layoutKey: input.layoutKey });
    return created;
  }

  async listUiComponents() {
    return db.select().from(uiComponents).orderBy(asc(uiComponents.componentType), asc(uiComponents.componentKey));
  }

  async upsertUiComponent(
    input: {
      id?: string;
      componentKey: string;
      componentType: string;
      displayName: string;
      schemaVersion?: number;
      propsJson?: Record<string, any>;
      dataSourceKey?: string | null;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    },
    adminId: string,
  ) {
    const payload = {
      componentKey: input.componentKey,
      componentType: input.componentType as any,
      displayName: input.displayName,
      schemaVersion: input.schemaVersion ?? 1,
      propsJson: input.propsJson ?? {},
      dataSourceKey: input.dataSourceKey ?? null,
      status: (input.status ?? "PUBLISHED") as any,
      createdByAdminId: adminId,
      publishedByAdminId: (input.status ?? "PUBLISHED") === "PUBLISHED" ? adminId : null,
      publishedAt: (input.status ?? "PUBLISHED") === "PUBLISHED" ? new Date() : null,
      updatedAt: new Date(),
    };

    if (input.id) {
      const [updated] = await db.update(uiComponents).set(payload).where(eq(uiComponents.id, input.id)).returning();
      await this.logAction(adminId, "ui_component_update", { componentId: input.id, componentKey: input.componentKey });
      return updated;
    }

    const [created] = await db.insert(uiComponents).values(payload as any).returning();
    if (!created) {
      throw new Error("Failed to create ui component");
    }
    await this.logAction(adminId, "ui_component_update", { componentId: created.id, componentKey: input.componentKey });
    return created;
  }

  async listComponentPositions(layoutId?: string) {
    return db
      .select()
      .from(componentPositions)
      .where(layoutId ? eq(componentPositions.layoutId, layoutId) : undefined)
      .orderBy(asc(componentPositions.sectionKey), asc(componentPositions.positionIndex));
  }

  async replaceComponentPositions(
    input: {
      layoutId: string;
      positions: Array<{
        componentId: string;
        sectionKey: string;
        slotKey?: string | null;
        breakpoint?: string;
        positionIndex: number;
        visibilityRulesJson?: Record<string, any>;
        overridesJson?: Record<string, any>;
      }>;
    },
    adminId: string,
  ) {
    await db.delete(componentPositions).where(eq(componentPositions.layoutId, input.layoutId));
    if (input.positions.length > 0) {
      await db.insert(componentPositions).values(
        input.positions.map((position) => ({
          layoutId: input.layoutId,
          componentId: position.componentId,
          sectionKey: position.sectionKey,
          slotKey: position.slotKey ?? null,
          breakpoint: position.breakpoint ?? "default",
          positionIndex: position.positionIndex,
          visibilityRulesJson: position.visibilityRulesJson ?? {},
          overridesJson: position.overridesJson ?? {},
        })) as any,
      );
    }
    await this.logAction(adminId, "ui_layout_positions_update", { layoutId: input.layoutId, count: input.positions.length });
    return this.listComponentPositions(input.layoutId);
  }

  // ─── Notification Campaigns ───
  async listNotificationCampaigns(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(notificationCampaigns).orderBy(desc(notificationCampaigns.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async createNotificationCampaign(data: { name: string; campaignType: string; segmentRuleJson?: any; scheduledAt?: Date }, adminId: string) {
    const campaign = await this.notificationService.createCampaign(data, adminId);
    await this.logAction(adminId, "notification_campaign_create", { campaignId: campaign.id });
    return campaign;
  }

  async runDueNotificationCampaigns(limit = 5, adminId: string) {
    const result = await this.notificationService.runDueCampaigns(limit);
    await this.logAction(adminId, "notification_campaign_run", { limit, processed: result.processed });
    return result;
  }

  async getNotificationDeliveryOperations() {
    return this.notificationService.getDeliveryOperations();
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

  async getSessionMonitoringSummary() {
    return this.securityService.getSessionMonitoringSummary();
  }

  async requireSessionStepUp(sessionId: string, reason: string, adminId: string) {
    const result = await this.securityService.requireSessionStepUp(sessionId, adminId, reason);
    await this.logAction(adminId, "session_step_up_required", { sessionId, reason });
    return result;
  }

  async listDataExportRequests(status?: string) {
    return this.complianceService.listDataExportRequests(status);
  }

  async processDataExportRequest(requestId: string, adminId: string) {
    const result = await this.complianceService.processDataExportRequest(requestId, adminId);
    await this.logAction(adminId, "data_export_process", { requestId });
    return result;
  }

  async runRetentionSweep(adminId: string) {
    const result = await this.complianceService.runRetentionSweep();
    await this.logAction(adminId, "retention_sweep_run", result as any);
    return result;
  }

  // ─── PK Management ───
  async listPkSessions(cursor?: string, limit = 20, status?: string) {
    return this.pkService.listSessions(cursor, limit, status);
  }

  async createPKBattle(hostAUserId: string, hostBUserId: string, battleDurationSeconds: number, adminId: string) {
    return this.pkService.createPKBattleByAdmin(hostAUserId, hostBUserId, battleDurationSeconds, adminId);
  }

  async cancelPKBattle(pkSessionId: string) {
    return this.pkService.cancelPKBattle(pkSessionId);
  }

  // ─── Cache Management ───
  async clearCache(pattern: string, adminId: string) {
    const redis = getRedis();
    let cursor = "0";
    let deleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await redis.del(...keys);
      }
    } while (cursor !== "0");

    await this.logAction(adminId, "cache_clear", { pattern, deleted });
    return { success: true, deleted };
  }

  // ─── Admin Audit Log ───
  async getAuditLog(cursor?: string, limit = 50) {
    if (await this.getAdminLogSchemaMode() === "legacy") {
      const offset = cursor ? decodeCursor(cursor) : 0;
      const result = await db.execute(sql`
        select
          id,
          admin_user_id as "adminId",
          action,
          target_entity as "targetType",
          target_entity_id as "targetId",
          reason,
          before_snapshot as "metadataJson",
          created_at as "createdAt"
        from admin_logs
        order by created_at desc
        limit ${limit + 1}
        offset ${offset}
      `);
      const rows = result.rows as Array<Record<string, unknown>>;
      const hasMore = rows.length > limit;
      return { items: hasMore ? rows.slice(0, limit) : rows, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
    }

    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── Dashboard Stats ───
  async getDashboardStats() {
    const totalUsers = await db.select({ count: count() }).from(users);
    const totalModels = (await this.getAdminModelSchemaMode()) === "legacy"
      ? await db.select({ count: count() }).from(users).where(eq(users.role, "MODEL" as any))
      : await db.select({ count: count() }).from(models).where(isNotNull(models.approvedAt));
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

  private async resolveAdminActorId(adminId: string) {
    const [actor] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(or(eq(admins.id, adminId), eq(admins.userId, adminId)))
      .limit(1);

    if (!actor) {
      throw new Error("Admin actor not found");
    }

    return actor.id;
  }

  private async fetchLegacyAdminUsers(userIds: string[]) {
    const result = await db.execute(sql`
      select
        u.id,
        coalesce(p.display_name, u.username) as "displayName",
        u.email,
        p.avatar_url as "avatarUrl",
        case
          when u.is_banned then 'BANNED'
          when u.is_suspended then 'SUSPENDED'
          else 'ACTIVE'
        end as status
      from users u
      left join profiles p on p.user_id = u.id
      where u.id = any(${userIds})
    `);

    return result.rows as Array<Record<string, unknown>>;
  }

  private mapAdminAction(action: string) {
    const normalized = action.trim().toUpperCase();
    const actionMap: Record<string, string> = {
      USER_STATUS_UPDATE: "USER_SUSPEND",
      USER_ROLE_UPDATE: "MANUAL_ADJUSTMENT",
      REPORT_REVIEW: "MANUAL_ADJUSTMENT",
      BAN_IMPOSE: "USER_SUSPEND",
      BAN_REVOKE: "MANUAL_ADJUSTMENT",
      MODEL_APPLICATION_APPROVE: "MODEL_APPROVE",
      MODEL_APPLICATION_REJECT: "MODEL_REJECT",
      WITHDRAW_APPROVE: "WITHDRAWAL_APPROVE",
      WITHDRAW_REJECT: "WITHDRAWAL_REJECT",
      GIFT_CREATE: "GIFT_CREATE",
      GIFT_UPDATE: "GIFT_UPDATE",
      PAYMENT_REFUND: "PAYOUT_APPROVE",
      PAYMENT_STATUS_UPDATE: "MANUAL_ADJUSTMENT",
      PAYMENT_DISPUTE_OPEN: "MANUAL_ADJUSTMENT",
      PAYMENT_DISPUTE_RESOLVE: "MANUAL_ADJUSTMENT",
      AGENCY_APPROVE: "MANUAL_ADJUSTMENT",
      AGENCY_APPLICATION_APPROVE: "MANUAL_ADJUSTMENT",
      AGENCY_APPLICATION_REJECT: "MANUAL_ADJUSTMENT",
      EVENT_CREATE: "PROMOTION_CREATE",
      EVENT_UPDATE: "MANUAL_ADJUSTMENT",
      EVENT_REWARDS_DISTRIBUTE: "MANUAL_ADJUSTMENT",
      CAMPAIGN_CREATE: "PROMOTION_CREATE",
      CAMPAIGN_UPDATE: "MANUAL_ADJUSTMENT",
      CAMPAIGN_REWARDS_DISTRIBUTE: "MANUAL_ADJUSTMENT",
      NOTIFICATION_CAMPAIGN_CREATE: "PROMOTION_CREATE",
      NOTIFICATION_CAMPAIGN_RUN: "MANUAL_ADJUSTMENT",
      PRICING_RULE_CREATE: "MANUAL_ADJUSTMENT",
      PRICING_RULE_UPDATE: "MANUAL_ADJUSTMENT",
      LEVEL_RULE_CREATE: "LEVEL_CREATE",
      SYSTEM_SETTING_UPDATE: "SETTING_UPDATE",
      FEATURE_FLAG_UPDATE: "SETTING_UPDATE",
      UI_LAYOUT_UPDATE: "CONFIG_PUBLISH",
      MODEL_AVAILABILITY_OVERRIDE: "MANUAL_ADJUSTMENT",
      MODEL_DEMO_VIDEO_REVIEW: "MANUAL_ADJUSTMENT",
      SESSION_STEP_UP_REQUIRED: "MANUAL_ADJUSTMENT",
      DATA_EXPORT_PROCESS: "MANUAL_ADJUSTMENT",
      RETENTION_SWEEP_RUN: "MANUAL_ADJUSTMENT",
      CACHE_CLEAR: "CONFIG_ROLLBACK",
    };

    return (actionMap[normalized] ?? "MANUAL_ADJUSTMENT") as any;
  }

  private mapAdminTargetType(details: Record<string, any>) {
    if (details.userId) return "USER" as any;
    if (details.modelUserId) return "MODEL" as any;
    if (details.giftId) return "GIFT" as any;
    if (details.reportId) return "CONFIG" as any;
    if (details.banId) return "USER" as any;
    if (details.requestId) return "WITHDRAWAL" as any;
    if (details.paymentId) return "PAYOUT" as any;
    if (details.campaignId || details.eventId) return "PROMOTION" as any;
    if (details.ruleId) return "SETTING" as any;
    return "CONFIG" as any;
  }

  private async logAction(adminId: string, action: string, details: Record<string, any>) {
    const actorAdminId = await this.resolveAdminActorId(adminId);
    const targetId = details.userId ?? details.modelUserId ?? details.demoVideoId ?? details.giftId ?? details.banId ?? details.reportId ?? details.ruleId ?? details.campaignId ?? details.eventId ?? details.flagId ?? details.requestId ?? details.agencyId ?? details.applicationId ?? details.paymentId ?? null;
    if (await this.getAdminLogSchemaMode() === "legacy") {
      await db.execute(sql`
        insert into admin_logs (
          admin_user_id,
          action,
          target_entity,
          target_entity_id,
          reason,
          before_snapshot,
          after_snapshot,
          created_at
        )
        values (
          ${adminId}::uuid,
          ${String(this.mapAdminAction(action))},
          ${String(this.mapAdminTargetType(details))},
          ${String(targetId ?? adminId)},
          ${JSON.stringify(details)},
          ${JSON.stringify(details)}::jsonb,
          null,
          now()
        )
      `);
      return;
    }

    await db.insert(adminLogs).values({
      adminId: actorAdminId,
      action: this.mapAdminAction(action),
      targetType: this.mapAdminTargetType(details),
      targetId: targetId ?? adminId,
      reason: JSON.stringify(details),
      ipAddress: "system",
      userAgent: "admin-api",
    });
  }
}
