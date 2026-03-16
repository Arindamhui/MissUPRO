import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { CampaignService } from "./campaign.service";
import { CampaignRouter } from "./campaign.router";

@Module({
  imports: [WalletModule],
  providers: [CampaignService, CampaignRouter],
  exports: [CampaignRouter, CampaignService],
})
export class CampaignsModule {}
