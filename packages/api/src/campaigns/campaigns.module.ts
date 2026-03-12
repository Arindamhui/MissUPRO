import { Module } from "@nestjs/common";
import { CampaignService } from "./campaign.service";
import { CampaignRouter } from "./campaign.router";

@Module({
  providers: [CampaignService, CampaignRouter],
  exports: [CampaignRouter, CampaignService],
})
export class CampaignsModule {}
