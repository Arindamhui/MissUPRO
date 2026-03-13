import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { AdminService } from "./admin.service";
import { createFeatureFlagSchema, upsertSystemSettingSchema } from "@missu/types";

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

      // Financial
      getFinancialOverview: this.trpc.adminProcedure
        .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
        .query(async ({ input }) => this.adminService.getFinancialOverview(input.startDate, input.endDate)),

      listWithdrawRequests: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listWithdrawRequests(input.status, input.cursor, input.limit)),

      processWithdrawRequest: this.trpc.adminProcedure
        .input(z.object({ requestId: z.string().uuid(), action: z.enum(["approve", "reject"]), reason: z.string().optional() }))
        .mutation(async ({ ctx, input }) => this.adminService.processWithdrawRequest(input.requestId, input.action, ctx.userId, input.reason)),

      // Gifts
      listGifts: this.trpc.adminProcedure
        .query(async () => this.adminService.listGifts()),

      createGift: this.trpc.adminProcedure
        .input(z.object({ name: z.string(), iconUrl: z.string().url(), coinPrice: z.number().int().min(1), category: z.string(), effectTier: z.string(), displayOrder: z.number().int().optional() }))
        .mutation(async ({ ctx, input }) => this.adminService.createGift(input, ctx.userId)),

      updateGift: this.trpc.adminProcedure
        .input(z.object({ giftId: z.string().uuid(), data: z.record(z.string(), z.any()) }))
        .mutation(async ({ ctx, input }) => this.adminService.updateGift(input.giftId, input.data, ctx.userId)),

      // VIP
      listVipSubscriptions: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listVipSubscriptions(input.cursor, input.limit)),

      // Agencies
      listAgencies: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listAgencies(input.cursor, input.limit)),

      approveAgency: this.trpc.adminProcedure
        .input(z.object({ agencyId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.adminService.approveAgency(input.agencyId, ctx.userId)),

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
        .input(z.object({ layoutName: z.string(), sectionsJson: z.any() }))
        .mutation(async ({ ctx, input }) => this.adminService.upsertUiLayoutConfig(input.layoutName, input.sectionsJson, ctx.userId)),

      // Notification Campaigns
      listNotificationCampaigns: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listNotificationCampaigns(input.cursor, input.limit)),

      createNotificationCampaign: this.trpc.adminProcedure
        .input(z.object({ name: z.string(), campaignType: z.string(), segmentRuleJson: z.any().optional(), scheduledAt: z.coerce.date().optional() }))
        .mutation(async ({ ctx, input }) => this.adminService.createNotificationCampaign(input, ctx.userId)),

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

      // PK Management
      listPkSessions: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.adminService.listPkSessions(input.cursor, input.limit)),

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
