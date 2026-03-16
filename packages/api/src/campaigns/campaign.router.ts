import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { CampaignService } from "./campaign.service";

@Injectable()
export class CampaignRouter {
  constructor(private readonly trpc: TrpcService, private readonly campaignService: CampaignService) {}

  get router() {
    return this.trpc.router({
      getActiveCampaigns: this.trpc.protectedProcedure
        .query(async () => this.campaignService.getActiveCampaigns()),

      getCampaignDetail: this.trpc.protectedProcedure
        .input(z.object({ campaignId: z.string().uuid() }))
        .query(async ({ input }) => this.campaignService.getCampaignDetail(input.campaignId)),

      joinCampaign: this.trpc.protectedProcedure
        .input(z.object({ campaignId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.campaignService.joinCampaign(ctx.userId, input.campaignId)),

      updateProgress: this.trpc.protectedProcedure
        .input(z.object({ campaignId: z.string().uuid(), progressData: z.record(z.string(), z.unknown()) }))
        .mutation(async ({ ctx, input }) => this.campaignService.updateProgress(ctx.userId, input.campaignId, input.progressData)),

      listCampaigns: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ input }) => this.campaignService.listCampaigns(input?.status, input?.cursor, input?.limit ?? 20)),

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
        .mutation(async ({ ctx, input }) => this.campaignService.upsertCampaign(input, ctx.userId)),

      getCampaignAnalytics: this.trpc.adminProcedure
        .input(z.object({ campaignId: z.string().uuid().optional() }).optional())
        .query(async ({ input }) => this.campaignService.getCampaignAnalytics(input?.campaignId)),

      distributeCampaignRewards: this.trpc.adminProcedure
        .input(z.object({ campaignId: z.string().uuid(), limit: z.number().int().min(1).max(500).default(200) }))
        .mutation(async ({ input }) => this.campaignService.distributeCampaignRewards(input.campaignId, input.limit)),
    });
  }
}
