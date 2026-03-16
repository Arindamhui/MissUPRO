import { Module } from "@nestjs/common";
import { PkModule } from "../pk/pk.module";
import { WalletModule } from "../wallet/wallet.module";
import { PaymentsModule } from "../payments/payments.module";
import { AgenciesModule } from "../agencies/agencies.module";
import { ReferralsModule } from "../referrals/referrals.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SecurityModule } from "../security/security.module";
import { EventsModule } from "../events/events.module";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { ModelsModule } from "../models/models.module";
import { AdminService } from "./admin.service";
import { AdminRouter } from "./admin.router";

@Module({
  imports: [
    PkModule,
    WalletModule,
    PaymentsModule,
    AgenciesModule,
    ReferralsModule,
    ComplianceModule,
    NotificationsModule,
    SecurityModule,
    EventsModule,
    CampaignsModule,
    ModelsModule,
  ],
  providers: [AdminService, AdminRouter],
  exports: [AdminRouter, AdminService],
})
export class AdminModule {}
