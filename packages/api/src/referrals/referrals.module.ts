import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { ReferralService } from "./referral.service";
import { ReferralRouter } from "./referral.router";

@Module({
  imports: [WalletModule],
  providers: [ReferralService, ReferralRouter],
  exports: [ReferralRouter, ReferralService],
})
export class ReferralsModule {}
