import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { CommonModule } from "./common/common.module";
import { TrpcCoreModule, TrpcModule } from "./trpc/trpc.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ModelsModule } from "./models/models.module";
import { CallsModule } from "./calls/calls.module";
import { ChatModule } from "./chat/chat.module";
import { GiftsModule } from "./gifts/gifts.module";
import { WalletModule } from "./wallet/wallet.module";
import { PaymentsModule } from "./payments/payments.module";
import { LiveModule } from "./streaming/live.module";
import { GamesModule } from "./games/games.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AdminModule } from "./admin/admin.module";
import { ModerationModule } from "./moderation/moderation.module";
import { FraudModule } from "./fraud/fraud.module";
import { MediaModule } from "./media/media.module";
import { VipModule } from "./vip/vip.module";
import { AgenciesModule } from "./agencies/agencies.module";
import { ReferralsModule } from "./referrals/referrals.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { CmsModule } from "./cms/cms.module";
import { SecurityModule } from "./security/security.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { EventsModule } from "./events/events.module";
import { LevelsModule } from "./levels/levels.module";
import { GroupAudioModule } from "./group-audio/group-audio.module";
import { PartyModule } from "./party/party.module";
import { SocialModule } from "./social/social.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { HealthModule } from "./health/health.module";
import { ConfigModule } from "./config/config.module";
import { PresenceModule } from "./presence/presence.module";
import { SupportModule } from "./support/support.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { PayoutsModule } from "./payouts/payouts.module";
import { MetricsModule } from "./metrics/metrics.module";
import { PkModule } from "./pk/pk.module";
import { LeaderboardsModule } from "./leaderboards/leaderboards.module";
import { JobsModule } from "./jobs/jobs.module";
import { MissuProModule } from "./missu-pro/missu-pro.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CommonModule,
    TrpcCoreModule,
    TrpcModule,
    HealthModule,
    MetricsModule,
    JobsModule,
    MissuProModule,
    ConfigModule,
    PayoutsModule,
    PkModule,
    LeaderboardsModule,
    PresenceModule,
    SupportModule,
    ComplianceModule,
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
    RealtimeModule,
  ],
})
export class AppModule {}
