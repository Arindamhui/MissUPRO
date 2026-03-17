import { Module, Global } from "@nestjs/common";
import { TrpcService } from "./trpc.service";
import { TrpcRouter } from "./trpc.router";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ModelsModule } from "../models/models.module";
import { CallsModule } from "../calls/calls.module";
import { ChatModule } from "../chat/chat.module";
import { GiftsModule } from "../gifts/gifts.module";
import { WalletModule } from "../wallet/wallet.module";
import { PaymentsModule } from "../payments/payments.module";
import { LiveModule } from "../streaming/live.module";
import { GamesModule } from "../games/games.module";
import { DiscoveryModule } from "../discovery/discovery.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminModule } from "../admin/admin.module";
import { ModerationModule } from "../moderation/moderation.module";
import { FraudModule } from "../fraud/fraud.module";
import { MediaModule } from "../media/media.module";
import { VipModule } from "../vip/vip.module";
import { AgenciesModule } from "../agencies/agencies.module";
import { ReferralsModule } from "../referrals/referrals.module";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CmsModule } from "../cms/cms.module";
import { SecurityModule } from "../security/security.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { EventsModule } from "../events/events.module";
import { LevelsModule } from "../levels/levels.module";
import { GroupAudioModule } from "../group-audio/group-audio.module";
import { PartyModule } from "../party/party.module";
import { SocialModule } from "../social/social.module";
import { ConfigModule } from "../config/config.module";
import { PresenceModule } from "../presence/presence.module";
import { SupportModule } from "../support/support.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { PayoutsModule } from "../payouts/payouts.module";
import { PkModule } from "../pk/pk.module";
import { LeaderboardsModule } from "../leaderboards/leaderboards.module";

// Global module: makes TrpcService available to all modules without explicit import
@Global()
@Module({
  providers: [TrpcService],
  exports: [TrpcService],
})
export class TrpcCoreModule {}

// Router module: imports all domain modules and builds the merged tRPC router
@Module({
  imports: [
    AuthModule,
    UsersModule,
    ModelsModule,
    CallsModule,
    ChatModule,
    GiftsModule,
    WalletModule,
    PaymentsModule,
    LiveModule,
    GamesModule,
    DiscoveryModule,
    NotificationsModule,
    AdminModule,
    ModerationModule,
    FraudModule,
    MediaModule,
    VipModule,
    AgenciesModule,
    ReferralsModule,
    CampaignsModule,
    CmsModule,
    SecurityModule,
    AnalyticsModule,
    EventsModule,
    LevelsModule,
    GroupAudioModule,
    PartyModule,
    SocialModule,
    ConfigModule,
    PresenceModule,
    SupportModule,
    ComplianceModule,
    PayoutsModule,
    PkModule,
    LeaderboardsModule,
  ],
  providers: [TrpcRouter],
  exports: [TrpcRouter],
})
export class TrpcModule {}
