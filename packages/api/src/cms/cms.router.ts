import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { CmsService } from "./cms.service";

@Injectable()
export class CmsRouter {
  constructor(private readonly trpc: TrpcService, private readonly cmsService: CmsService) {}

  get router() {
    return this.trpc.router({
      listPublicBanners: this.trpc.procedure.query(async () => this.cmsService.listPublicBanners()),

      // Banners
      listBanners: this.trpc.adminProcedure.query(async () => this.cmsService.listBanners()),
      createBanner: this.trpc.adminProcedure
        .input(z.object({ title: z.string(), imageUrl: z.string().url(), linkType: z.string(), linkTarget: z.string().optional(), position: z.number().int().optional(), startDate: z.coerce.date().optional(), endDate: z.coerce.date().optional() }))
        .mutation(async ({ ctx, input }) => this.cmsService.createBanner({ ...input, createdByAdminId: ctx.userId })),
      updateBanner: this.trpc.adminProcedure
        .input(z.object({ bannerId: z.string().uuid(), data: z.record(z.string(), z.any()) }))
        .mutation(async ({ input }) => this.cmsService.updateBanner(input.bannerId, input.data)),
      deleteBanner: this.trpc.adminProcedure
        .input(z.object({ bannerId: z.string().uuid() }))
        .mutation(async ({ input }) => this.cmsService.deleteBanner(input.bannerId)),

      // Themes
      listThemes: this.trpc.adminProcedure.query(async () => this.cmsService.listThemes()),
      createTheme: this.trpc.adminProcedure
        .input(z.object({ name: z.string(), description: z.string().optional(), primaryColor: z.string(), secondaryColor: z.string(), backgroundColor: z.string(), cardBackgroundColor: z.string(), textPrimaryColor: z.string(), textSecondaryColor: z.string(), accentGradientStart: z.string(), accentGradientEnd: z.string() }))
        .mutation(async ({ ctx, input }) => this.cmsService.createTheme({ ...input, createdByAdminId: ctx.userId })),
      updateTheme: this.trpc.adminProcedure
        .input(z.object({ themeId: z.string().uuid(), data: z.record(z.string(), z.any()) }))
        .mutation(async ({ input }) => this.cmsService.updateTheme(input.themeId, input.data)),
      getThemeAssets: this.trpc.adminProcedure
        .input(z.object({ themeId: z.string().uuid() }))
        .query(async ({ input }) => this.cmsService.getThemeAssets(input.themeId)),
      addThemeAsset: this.trpc.adminProcedure
        .input(z.object({ themeId: z.string().uuid(), assetType: z.string(), storageKey: z.string(), mimeType: z.string(), sizeBytes: z.number().int() }))
        .mutation(async ({ input }) => this.cmsService.addThemeAsset(input.themeId, input)),

      // Promotions
      listPromotions: this.trpc.adminProcedure.query(async () => this.cmsService.listPromotions()),
      createPromotion: this.trpc.adminProcedure
        .input(z.object({
          name: z.string().min(2).max(120),
          description: z.string().max(1000).optional(),
          promotionType: z.enum(["COIN_BONUS", "SEASONAL_EVENT", "REFERRAL_BOOST", "FIRST_PURCHASE_BONUS", "REACTIVATION_BONUS"]),
          status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "ENDED"]).optional(),
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
          targetAudience: z.enum(["ALL_USERS", "NEW_USERS", "INACTIVE_USERS", "VIP_USERS", "REGION_SEGMENT"]).optional(),
          targetRegion: z.string().max(20).optional(),
          bannerImageUrl: z.string().url().optional(),
          maxBudget: z.number().nonnegative().optional(),
          rewardRulesJson: z.any().optional(),
        }))
        .mutation(async ({ ctx, input }) => this.cmsService.createPromotion({ ...input, createdByAdminId: ctx.userId })),
      updatePromotion: this.trpc.adminProcedure
        .input(z.object({
          promotionId: z.string().uuid(),
          data: z.object({
            name: z.string().min(2).max(120).optional(),
            description: z.string().max(1000).optional(),
            promotionType: z.enum(["COIN_BONUS", "SEASONAL_EVENT", "REFERRAL_BOOST", "FIRST_PURCHASE_BONUS", "REACTIVATION_BONUS"]).optional(),
            status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "ENDED"]).optional(),
            targetAudience: z.enum(["ALL_USERS", "NEW_USERS", "INACTIVE_USERS", "VIP_USERS", "REGION_SEGMENT"]).optional(),
            targetRegion: z.string().max(20).optional(),
            bannerImageUrl: z.string().url().optional(),
            maxBudget: z.number().nonnegative().optional(),
            startDate: z.coerce.date().optional(),
            endDate: z.coerce.date().optional(),
            rewardRulesJson: z.any().optional(),
          }),
        }))
        .mutation(async ({ input }) => this.cmsService.updatePromotion(input.promotionId, input.data)),
      getActivePromotions: this.trpc.protectedProcedure
        .query(async () => this.cmsService.getActivePromotions()),

      // Levels
      listLevels: this.trpc.adminProcedure.query(async () => this.cmsService.listLevels()),
      createLevel: this.trpc.adminProcedure
        .input(z.object({ levelNumber: z.number().int().min(1), levelName: z.string(), levelTrack: z.string(), thresholdValue: z.number().int().min(0), iconUrl: z.string().optional() }))
        .mutation(async ({ ctx, input }) => this.cmsService.createLevel({ ...input, createdByAdminId: ctx.userId })),
      updateLevel: this.trpc.adminProcedure
        .input(z.object({ levelId: z.string().uuid(), data: z.record(z.string(), z.any()) }))
        .mutation(async ({ input }) => this.cmsService.updateLevel(input.levelId, input.data)),
      getLevelRewards: this.trpc.adminProcedure
        .input(z.object({ levelId: z.string().uuid() }))
        .query(async ({ input }) => this.cmsService.getLevelRewards(input.levelId)),
      addLevelReward: this.trpc.adminProcedure
        .input(z.object({ levelId: z.string().uuid(), rewardType: z.string(), rewardValue: z.string(), rewardName: z.string(), description: z.string() }))
        .mutation(async ({ input }) => this.cmsService.addLevelReward(input.levelId, input)),

      // Homepage Sections
      listHomepageSections: this.trpc.adminProcedure.query(async () => this.cmsService.listHomepageSections()),
      upsertHomepageSection: this.trpc.adminProcedure
        .input(z.object({ id: z.string().uuid().optional(), sectionType: z.string(), position: z.number().int(), configJson: z.any().optional(), status: z.string().default("ACTIVE") }))
        .mutation(async ({ ctx, input }) => this.cmsService.upsertHomepageSection({ ...input, createdByAdminId: ctx.userId })),
      deleteHomepageSection: this.trpc.adminProcedure
        .input(z.object({ sectionId: z.string().uuid() }))
        .mutation(async ({ input }) => this.cmsService.deleteHomepageSection(input.sectionId)),
    });
  }
}
