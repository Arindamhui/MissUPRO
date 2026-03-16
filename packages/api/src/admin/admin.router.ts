import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { AdminService } from "./admin.service";
import {
  createFeatureFlagSchema,
  upsertSystemSettingSchema,
  getModelAvailabilitySchema,
  getModelDemoVideosSchema,
  reviewModelDemoVideoSchema,
} from "@missu/types";

@Injectable()
export class AdminRouter {
  constructor(private readonly trpc: TrpcService, private readonly adminService: AdminService) {}

  get router() {
    return this.trpc.router({
      // Dashboard
      getDashboardStats: this.trpc.adminProcedure
        .query(async () => this.adminService.getDashboardStats()),

      // Users
      listUsers: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20), search: z.string().optional() }))
        .query(async ({ input }) => this.adminService.listUsers(input.cursor, input.limit, input.search)),

      getUserDetail: this.trpc.adminProcedure
        .input(z.object({ userId: z.string().uuid() }))
        .query(async ({ input }) => this.adminService.getUserDetail(input.userId)),

      updateUserStatus: this.trpc.adminProcedure
        .input(z.object({ userId: z.string().uuid(), status: z.string() }))
        .mutation(async ({ ctx, input }) => this.adminService.updateUserStatus(input.userId, input.status, ctx.userId)),

      updateUserRole: this.trpc.adminProcedure
        .input(z.object({ userId: z.string().uuid(), role: z.string() }))
        .mutation(async ({ ctx, input }) => this.adminService.updateUserRole(input.userId, input.role, ctx.userId)),

      // Model Applications
      listModelApplications: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listModelApplications(input.status, input.cursor, input.limit)),

      approveModelApplication: this.trpc.adminProcedure
        .input(z.object({ applicationId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.adminService.approveModelApplication(input.applicationId, ctx.userId)),

      rejectModelApplication: this.trpc.adminProcedure
        .input(z.object({ applicationId: z.string().uuid(), reason: z.string() }))
        .mutation(async ({ ctx, input }) => this.adminService.rejectModelApplication(input.applicationId, input.reason, ctx.userId)),

      listModels: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ input }) => this.adminService.listModels(input?.status, input?.cursor, input?.limit ?? 20)),

      getModelAvailability: this.trpc.adminProcedure
        .input(getModelAvailabilitySchema)
        .query(async ({ input }) => this.adminService.getModelAvailability(input.modelUserId)),

      overrideModelAvailability: this.trpc.adminProcedure
        .input(z.object({ modelUserId: z.string().uuid(), isOnline: z.boolean() }))
        .mutation(async ({ ctx, input }) => this.adminService.overrideModelAvailability(input.modelUserId, input.isOnline, ctx.userId)),

      listModelDemoVideos: this.trpc.adminProcedure
        .input(getModelDemoVideosSchema)
        .query(async ({ input }) => this.adminService.listModelDemoVideos(input.modelUserId, input.status)),

      reviewModelDemoVideo: this.trpc.adminProcedure
        .input(reviewModelDemoVideoSchema)
        .mutation(async ({ ctx, input }) =>
          this.adminService.reviewModelDemoVideo(input.demoVideoId, input.status, ctx.userId, input.rejectionReason),
        ),

      // Financial
      getFinancialOverview: this.trpc.adminProcedure
        .input(z.object({ startDate: z.coerce.date().optional(), endDate: z.coerce.date().optional() }).optional())
        .query(async ({ input }) => {
          const end = input?.endDate ?? new Date();
          const start = input?.startDate ?? new Date(end.getTime() - 30 * 86400000);
          return this.adminService.getFinancialOverview(start, end);
        }),

      listWithdrawRequests: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listWithdrawRequests(input.status, input.cursor, input.limit)),

      processWithdrawRequest: this.trpc.adminProcedure
        .input(z.object({ requestId: z.string().uuid(), action: z.enum(["approve", "reject"]), reason: z.string().optional() }))
        .mutation(async ({ ctx, input }) => this.adminService.processWithdrawRequest(input.requestId, input.action, ctx.userId, input.reason)),

      listPayments: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20), userId: z.string().uuid().optional(), status: z.string().optional() }))
        .query(async ({ input }) => this.adminService.listPayments(input.cursor, input.limit, input.userId, input.status)),

      getPaymentDetail: this.trpc.adminProcedure
        .input(z.object({ paymentId: z.string().uuid() }))
        .query(async ({ input }) => this.adminService.getPaymentDetail(input.paymentId)),

      listWebhookEvents: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) }).optional())
        .query(async ({ input }) => this.adminService.listWebhookEvents(input?.cursor, input?.limit ?? 50)),

      listPaymentDisputes: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50), status: z.string().optional() }).optional())
        .query(async ({ input }) => this.adminService.listPaymentDisputes(input?.cursor, input?.limit ?? 50, input?.status)),

      openPaymentDispute: this.trpc.adminProcedure
        .input(z.object({
          paymentId: z.string().uuid(),
          providerDisputeId: z.string().min(3),
          disputeReason: z.string().min(3).max(500),
          amountUsd: z.number().positive().optional(),
          metadataJson: z.record(z.string(), z.unknown()).optional(),
        }))
        .mutation(async ({ ctx, input }) =>
          this.adminService.openPaymentDispute(
            input.paymentId,
            input.providerDisputeId,
            input.disputeReason,
            input.amountUsd ?? null,
            input.metadataJson,
            ctx.userId,
          ),
        ),

      resolvePaymentDispute: this.trpc.adminProcedure
        .input(z.object({
          disputeId: z.string().uuid(),
          status: z.enum(["UNDER_REVIEW", "WON", "LOST", "RESOLVED"]),
          resolutionNotes: z.string().max(1000).optional(),
        }))
        .mutation(async ({ ctx, input }) =>
          this.adminService.resolvePaymentDispute(input.disputeId, input.status, input.resolutionNotes, ctx.userId),
        ),

      createRefund: this.trpc.adminProcedure
        .input(z.object({ paymentId: z.string().uuid(), amountUsd: z.number().optional(), idempotencyKey: z.string().optional() }))
        .mutation(async ({ ctx, input }) => this.adminService.createRefund(input.paymentId, input.amountUsd ?? null, input.idempotencyKey, ctx.userId)),

      updatePaymentStatus: this.trpc.adminProcedure
        .input(z.object({ paymentId: z.string().uuid(), status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED", "DISPUTED"]) }))
        .mutation(async ({ ctx, input }) => this.adminService.updatePaymentStatus(input.paymentId, input.status, ctx.userId)),

      listLedgerMismatches: this.trpc.adminProcedure
        .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }))
        .query(async ({ input }) => this.adminService.listLedgerMismatches(input.limit)),

      runPaymentReconciliation: this.trpc.adminProcedure
        .input(z.object({ limit: z.number().int().min(1).max(1000).default(500) }))
        .query(async ({ input }) => this.adminService.runPaymentReconciliation(input.limit)),

      // Gifts
      listGifts: this.trpc.adminProcedure
        .query(async () => this.adminService.listGifts()),

      createGift: this.trpc.adminProcedure
        .input(z.object({
          name: z.string().min(2).max(120),
          iconUrl: z.string().url(),
          coinPrice: z.number().int().min(1),
          diamondCredit: z.number().int().min(0),
          category: z.string().min(2).max(60),
          effectTier: z.enum(["STANDARD", "PREMIUM", "LEGENDARY"]),
          displayOrder: z.number().int().optional(),
          supportedContexts: z.array(z.enum([
            "LIVE_STREAM",
            "VIDEO_CALL",
            "VOICE_CALL",
            "CHAT_CONVERSATION",
            "PK_BATTLE",
            "GROUP_AUDIO",
            "PARTY",
          ])).min(1).optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => this.adminService.createGift(input, ctx.userId)),

      updateGift: this.trpc.adminProcedure
        .input(z.object({ giftId: z.string().uuid(), data: z.record(z.string(), z.any()) }))
        .mutation(async ({ ctx, input }) => this.adminService.updateGift(input.giftId, input.data, ctx.userId)),

      // VIP
      listVipSubscriptions: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listVipSubscriptions(input.cursor, input.limit)),

      // Referrals
      getReferralOverview: this.trpc.adminProcedure
        .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).optional())
        .query(async ({ input }) => this.adminService.getReferralOverview(input?.limit ?? 25)),

      // Events
      listEvents: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ input }) => this.adminService.listEvents(input?.status, input?.cursor, input?.limit ?? 20)),

      createEvent: this.trpc.adminProcedure
        .input(z.object({
          title: z.string().min(2).max(120),
          description: z.string().min(5).max(1000),
          eventType: z.string().min(2).max(60),
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
          rulesJson: z.any().optional(),
          rewardPoolJson: z.any().optional(),
        }))
        .mutation(async ({ ctx, input }) => this.adminService.createEvent(input, ctx.userId)),

      updateEvent: this.trpc.adminProcedure
        .input(z.object({ eventId: z.string().uuid(), data: z.record(z.string(), z.unknown()) }))
        .mutation(async ({ ctx, input }) => this.adminService.updateEvent(input.eventId, input.data, ctx.userId)),

      getEventAnalytics: this.trpc.adminProcedure
        .input(z.object({ eventId: z.string().uuid() }))
        .query(async ({ input }) => this.adminService.getEventAnalytics(input.eventId)),

      distributeEventRewards: this.trpc.adminProcedure
        .input(z.object({ eventId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.adminService.distributeEventRewards(input.eventId, ctx.userId)),

      // Campaigns
      listCampaigns: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ input }) => this.adminService.listCampaigns(input?.status, input?.cursor, input?.limit ?? 20)),

      upsertCampaign: this.trpc.adminProcedure
        .input(z.object({
          campaignId: z.string().uuid().optional(),
          name: z.string().min(2).max(120),
          campaignType: z.string().min(2).max(60),
          startAt: z.coerce.date(),
          endAt: z.coerce.date(),
          status: z.string().optional(),
          segmentRuleJson: z.any().optional(),
          rewardRuleJson: z.any().optional(),
          budgetLimitJson: z.any().optional(),
        }))
        .mutation(async ({ ctx, input }) => this.adminService.upsertCampaign(input, ctx.userId)),

      getCampaignAnalytics: this.trpc.adminProcedure
        .input(z.object({ campaignId: z.string().uuid().optional() }).optional())
        .query(async ({ input }) => this.adminService.getCampaignAnalytics(input?.campaignId)),

      distributeCampaignRewards: this.trpc.adminProcedure
        .input(z.object({ campaignId: z.string().uuid(), limit: z.number().int().min(1).max(500).default(200) }))
        .mutation(async ({ ctx, input }) => this.adminService.distributeCampaignRewards(input.campaignId, ctx.userId, input.limit)),

      // Agencies
      listAgencies: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listAgencies(input.cursor, input.limit)),

      approveAgency: this.trpc.adminProcedure
        .input(z.object({ agencyId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.adminService.approveAgency(input.agencyId, ctx.userId)),

      listAgencyApplications: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ input }) => this.adminService.listAgencyApplications(input?.status, input?.cursor, input?.limit ?? 20)),

      approveAgencyApplication: this.trpc.adminProcedure
        .input(z.object({ applicationId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.adminService.approveAgencyApplication(input.applicationId, ctx.userId)),

      rejectAgencyApplication: this.trpc.adminProcedure
        .input(z.object({ applicationId: z.string().uuid(), notes: z.string().max(1000).optional() }))
        .mutation(async ({ ctx, input }) => this.adminService.rejectAgencyApplication(input.applicationId, ctx.userId, input.notes)),

      listAgencyCommissionRecords: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ input }) => this.adminService.listAgencyCommissionRecords(input?.cursor, input?.limit ?? 20)),

      // Moderation
      listFraudFlags: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listFraudFlags(input.cursor, input.limit)),

      resolveFraudFlag: this.trpc.adminProcedure
        .input(z.object({ flagId: z.string().uuid(), action: z.string() }))
        .mutation(async ({ ctx, input }) => this.adminService.resolveFraudFlag(input.flagId, input.action, ctx.userId)),

      listMediaScanResults: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listMediaScanResults(input.status, input.cursor, input.limit)),

      listReports: this.trpc.adminProcedure
        .input(z.object({
          status: z.enum(["OPEN", "UNDER_REVIEW", "ACTIONED", "DISMISSED", "RESOLVED"]).optional(),
          entityType: z.enum(["USER", "LIVE_STREAM", "DM_MESSAGE", "CALL_SESSION", "GIFT_TRANSACTION", "PAYMENT", "MEDIA_ASSET", "COMMENT"]).optional(),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(20),
        }).optional())
        .query(async ({ input }) => this.adminService.listReports(input?.status, input?.entityType, input?.cursor, input?.limit ?? 20)),

      reviewReport: this.trpc.adminProcedure
        .input(z.object({
          reportId: z.string().uuid(),
          status: z.enum(["UNDER_REVIEW", "ACTIONED", "DISMISSED", "RESOLVED"]),
          resolutionNotes: z.string().max(1000).optional(),
        }))
        .mutation(async ({ ctx, input }) => this.adminService.reviewReport(input.reportId, input.status, input.resolutionNotes, ctx.userId)),

      listBans: this.trpc.adminProcedure
        .input(z.object({
          status: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).optional(),
          scope: z.enum(["ACCOUNT", "LIVE", "DM", "CALL", "WITHDRAWAL"]).optional(),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(20),
        }).optional())
        .query(async ({ input }) => this.adminService.listBans(input?.status, input?.scope, input?.cursor, input?.limit ?? 20)),

      imposeBan: this.trpc.adminProcedure
        .input(z.object({
          userId: z.string().uuid(),
          scope: z.enum(["ACCOUNT", "LIVE", "DM", "CALL", "WITHDRAWAL"]),
          reason: z.enum(["HARASSMENT", "SPAM", "FRAUD", "CHARGEBACK_ABUSE", "SELF_GIFTING", "UNDERAGE_RISK", "POLICY_VIOLATION", "OTHER"]),
          notes: z.string().max(1000).optional(),
          sourceReportId: z.string().uuid().optional(),
          endsAt: z.coerce.date().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => this.adminService.imposeBan(input, ctx.userId)),

      revokeBan: this.trpc.adminProcedure
        .input(z.object({ banId: z.string().uuid(), notes: z.string().max(1000).optional() }))
        .mutation(async ({ ctx, input }) => this.adminService.revokeBan(input.banId, input.notes, ctx.userId)),

      // System Settings
      getSystemSettings: this.trpc.adminProcedure
        .query(async () => this.adminService.getSystemSettings()),

      upsertSystemSetting: this.trpc.adminProcedure
        .input(upsertSystemSettingSchema)
        .mutation(async ({ ctx, input }) => this.adminService.upsertSystemSetting(input, ctx.userId)),

      // Feature Flags
      listFeatureFlags: this.trpc.adminProcedure
        .query(async () => this.adminService.listFeatureFlags()),

      upsertFeatureFlag: this.trpc.adminProcedure
        .input(createFeatureFlagSchema)
        .mutation(async ({ ctx, input }) => this.adminService.upsertFeatureFlag(input, ctx.userId)),

      // UI / CMS
      listHomepageSections: this.trpc.adminProcedure
        .query(async () => this.adminService.listHomepageSections()),

      upsertHomepageSection: this.trpc.adminProcedure
        .input(z.object({ id: z.string().uuid().optional(), sectionType: z.string(), position: z.number().int(), status: z.string().default("ACTIVE"), configJson: z.any().optional() }))
        .mutation(async ({ ctx, input }) => this.adminService.upsertHomepageSection(input, ctx.userId)),

      listUiLayoutConfigs: this.trpc.adminProcedure
        .query(async () => this.adminService.listUiLayoutConfigs()),

      upsertUiLayoutConfig: this.trpc.adminProcedure
        .input(z.object({ layoutName: z.string(), sectionsJson: z.any(), platform: z.enum(["MOBILE", "WEB", "ALL"]).default("MOBILE") }))
        .mutation(async ({ ctx, input }) => this.adminService.upsertUiLayoutConfig(input.layoutName, input.sectionsJson, ctx.userId, input.platform)),

      listUiLayouts: this.trpc.adminProcedure
        .query(async () => this.adminService.listUiLayouts()),

      upsertUiLayout: this.trpc.adminProcedure
        .input(z.object({
          id: z.string().uuid().optional(),
          layoutKey: z.string().min(1),
          layoutName: z.string().min(1),
          screenKey: z.string().min(1),
          platform: z.enum(["MOBILE", "WEB", "ALL"]).default("MOBILE"),
          environment: z.string().optional(),
          regionCode: z.string().nullable().optional(),
          status: z.enum(["DRAFT", "PUBLISHED", "ROLLED_BACK"]).default("PUBLISHED"),
          version: z.number().int().min(1).default(1),
          tabNavigationJson: z.array(z.record(z.string(), z.any())).default([]),
          metadataJson: z.record(z.string(), z.any()).default({}),
          effectiveFrom: z.coerce.date().optional(),
          effectiveTo: z.coerce.date().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => this.adminService.upsertUiLayout(input, ctx.userId)),

      listUiComponents: this.trpc.adminProcedure
        .query(async () => this.adminService.listUiComponents()),

      upsertUiComponent: this.trpc.adminProcedure
        .input(z.object({
          id: z.string().uuid().optional(),
          componentKey: z.string().min(1),
          componentType: z.enum(["BANNER", "CAROUSEL", "GRID", "CTA", "TABS", "CARD_LIST", "ANNOUNCEMENT", "FLOATING_ACTION"]),
          displayName: z.string().min(1),
          schemaVersion: z.number().int().min(1).default(1),
          propsJson: z.record(z.string(), z.any()).default({}),
          dataSourceKey: z.string().nullable().optional(),
          status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
        }))
        .mutation(async ({ ctx, input }) => this.adminService.upsertUiComponent(input, ctx.userId)),

      listComponentPositions: this.trpc.adminProcedure
        .input(z.object({ layoutId: z.string().uuid().optional() }).optional())
        .query(async ({ input }) => this.adminService.listComponentPositions(input?.layoutId)),

      replaceComponentPositions: this.trpc.adminProcedure
        .input(z.object({
          layoutId: z.string().uuid(),
          positions: z.array(z.object({
            componentId: z.string().uuid(),
            sectionKey: z.string().min(1),
            slotKey: z.string().nullable().optional(),
            breakpoint: z.string().default("default"),
            positionIndex: z.number().int().min(0),
            visibilityRulesJson: z.record(z.string(), z.any()).default({}),
            overridesJson: z.record(z.string(), z.any()).default({}),
          })),
        }))
        .mutation(async ({ ctx, input }) => this.adminService.replaceComponentPositions(input, ctx.userId)),

      // Notification Campaigns
      listNotificationCampaigns: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listNotificationCampaigns(input.cursor, input.limit)),

      createNotificationCampaign: this.trpc.adminProcedure
        .input(z.object({ name: z.string(), campaignType: z.string(), segmentRuleJson: z.any().optional(), scheduledAt: z.coerce.date().optional() }))
        .mutation(async ({ ctx, input }) => this.adminService.createNotificationCampaign(input, ctx.userId)),

      runDueNotificationCampaigns: this.trpc.adminProcedure
        .input(z.object({ limit: z.number().int().min(1).max(50).default(5) }).optional())
        .mutation(async ({ ctx, input }) => this.adminService.runDueNotificationCampaigns(input?.limit ?? 5, ctx.userId)),

      getNotificationDeliveryOperations: this.trpc.adminProcedure
        .query(async () => this.adminService.getNotificationDeliveryOperations()),

      // Call Pricing Rules
      listCallPricingRules: this.trpc.adminProcedure
        .query(async () => this.adminService.listCallPricingRules()),

      upsertCallPricingRule: this.trpc.adminProcedure
        .input(z.object({ id: z.string().uuid().optional(), data: z.record(z.string(), z.any()) }))
        .mutation(async ({ ctx, input }) => this.adminService.upsertCallPricingRule({ id: input.id, ...input.data }, ctx.userId)),

      // Model Level Rules
      listModelLevelRules: this.trpc.adminProcedure
        .query(async () => this.adminService.listModelLevelRules()),

      upsertModelLevelRule: this.trpc.adminProcedure
        .input(z.object({ id: z.string().uuid().optional(), data: z.record(z.string(), z.any()) }))
        .mutation(async ({ ctx, input }) => this.adminService.upsertModelLevelRule({ id: input.id, ...input.data }, ctx.userId)),

      // DM Management
      listDmConversations: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listDmConversations(input.cursor, input.limit)),

      // Group Audio Management
      listGroupAudioRooms: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listGroupAudioRooms(input.cursor, input.limit)),

      // Party Management
      listPartyRooms: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listPartyRooms(input.cursor, input.limit)),

      getSessionMonitoringSummary: this.trpc.adminProcedure
        .query(async () => this.adminService.getSessionMonitoringSummary()),

      requireSessionStepUp: this.trpc.adminProcedure
        .input(z.object({ sessionId: z.string().uuid(), reason: z.string().min(3).max(500) }))
        .mutation(async ({ ctx, input }) => this.adminService.requireSessionStepUp(input.sessionId, input.reason, ctx.userId)),

      listDataExportRequests: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional() }).optional())
        .query(async ({ input }) => this.adminService.listDataExportRequests(input?.status)),

      processDataExportRequest: this.trpc.adminProcedure
        .input(z.object({ requestId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.adminService.processDataExportRequest(input.requestId, ctx.userId)),

      runRetentionSweep: this.trpc.adminProcedure
        .mutation(async ({ ctx }) => this.adminService.runRetentionSweep(ctx.userId)),

      // PK Management
      listPkSessions: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20), status: z.string().optional() }))
        .query(async ({ input }) => this.adminService.listPkSessions(input.cursor, input.limit, input.status)),

      createPKBattle: this.trpc.adminProcedure
        .input(z.object({
          hostAUserId: z.string().uuid(),
          hostBUserId: z.string().uuid(),
          battleDurationSeconds: z.number().int().min(60).max(600),
        }))
        .mutation(async ({ ctx, input }) =>
          this.adminService.createPKBattle(input.hostAUserId, input.hostBUserId, input.battleDurationSeconds, ctx.userId)),

      cancelPKBattle: this.trpc.adminProcedure
        .input(z.object({ pkSessionId: z.string().uuid() }))
        .mutation(async ({ input }) => this.adminService.cancelPKBattle(input.pkSessionId)),

      // Cache
      clearCache: this.trpc.adminProcedure
        .input(z.object({ pattern: z.string().max(200) }))
        .mutation(async ({ ctx, input }) => this.adminService.clearCache(input.pattern, ctx.userId)),

      // Audit Log
      getAuditLog: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) }))
        .query(async ({ input }) => this.adminService.getAuditLog(input.cursor, input.limit)),
    });
  }
}
