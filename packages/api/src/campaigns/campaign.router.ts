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
    });
  }
}
