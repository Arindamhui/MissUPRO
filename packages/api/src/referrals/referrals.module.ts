import { Module } from "@nestjs/common";
import { ReferralService } from "./referral.service";
import { ReferralRouter } from "./referral.router";

@Module({
  providers: [ReferralService, ReferralRouter],
  exports: [ReferralRouter, ReferralService],
})
export class ReferralsModule {}
