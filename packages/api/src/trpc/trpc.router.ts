import { Injectable } from "@nestjs/common";
import { TrpcService } from "./trpc.service";
import { AuthRouter } from "../auth/auth.router";
import { UserRouter } from "../users/user.router";
import { ModelRouter } from "../models/model.router";
import { CallRouter } from "../calls/call.router";
import { ChatRouter } from "../chat/chat.router";
import { GiftRouter } from "../gifts/gift.router";
import { WalletRouter } from "../wallet/wallet.router";
import { PaymentRouter } from "../payments/payment.router";
import { LiveRouter } from "../streaming/live.router";
import { GameRouter } from "../games/game.router";
import { DiscoveryRouter } from "../discovery/discovery.router";
import { NotificationRouter } from "../notifications/notification.router";
import { AdminRouter } from "../admin/admin.router";
import { ModerationRouter } from "../moderation/moderation.router";
import { FraudRouter } from "../fraud/fraud.router";
import { MediaRouter } from "../media/media.router";
import { VipRouter } from "../vip/vip.router";
import { AgencyRouter } from "../agencies/agency.router";
import { ReferralRouter } from "../referrals/referral.router";
import { CampaignRouter } from "../campaigns/campaign.router";
import { CmsRouter } from "../cms/cms.router";
import { SecurityRouter } from "../security/security.router";
import { AnalyticsRouter } from "../analytics/analytics.router";
import { EventRouter } from "../events/event.router";
import { LevelRouter } from "../levels/level.router";
import { GroupAudioRouter } from "../group-audio/group-audio.router";
import { PartyRouter } from "../party/party.router";
import { SocialRouter } from "../social/social.router";
import { ConfigRouter } from "../config/config.router";
import { PresenceRouter } from "../presence/presence.router";
import { SupportRouter } from "../support/support.router";
import { ComplianceRouter } from "../compliance/compliance.router";
import { PayoutsRouter } from "../payouts/payouts.router";
import { PkRouter } from "../pk/pk.router";
import { LeaderboardsRouter } from "../leaderboards/leaderboards.router";

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly auth: AuthRouter,
    private readonly user: UserRouter,
    private readonly model: ModelRouter,
    private readonly call: CallRouter,
    private readonly chat: ChatRouter,
    private readonly gift: GiftRouter,
    private readonly wallet: WalletRouter,
    private readonly payment: PaymentRouter,
    private readonly live: LiveRouter,
    private readonly game: GameRouter,
    private readonly discovery: DiscoveryRouter,
    private readonly notification: NotificationRouter,
    private readonly admin: AdminRouter,
    private readonly moderation: ModerationRouter,
    private readonly fraud: FraudRouter,
    private readonly media: MediaRouter,
    private readonly vip: VipRouter,
    private readonly agency: AgencyRouter,
    private readonly referral: ReferralRouter,
    private readonly campaign: CampaignRouter,
    private readonly cms: CmsRouter,
    private readonly security: SecurityRouter,
    private readonly analytics: AnalyticsRouter,
    private readonly event: EventRouter,
    private readonly level: LevelRouter,
    private readonly groupAudio: GroupAudioRouter,
    private readonly party: PartyRouter,
    private readonly social: SocialRouter,
    private readonly config: ConfigRouter,
    private readonly presence: PresenceRouter,
    private readonly support: SupportRouter,
    private readonly compliance: ComplianceRouter,
    private readonly payouts: PayoutsRouter,
    private readonly pk: PkRouter,
    private readonly leaderboards: LeaderboardsRouter,
  ) {}

  get appRouter() {
    return this.trpc.router({
      auth: this.auth.router,
      user: this.user.router,
      model: this.model.router,
      calls: this.call.router,
      chat: this.chat.router,
      gift: this.gift.router,
      wallet: this.wallet.router,
      payment: this.payment.router,
      live: this.live.router,
      game: this.game.router,
      discovery: this.discovery.router,
      notification: this.notification.router,
      admin: this.admin.router,
      moderation: this.moderation.router,
      fraud: this.fraud.router,
      media: this.media.router,
      vip: this.vip.router,
      agency: this.agency.router,
      referral: this.referral.router,
      referrals: this.referral.router,
      campaign: this.campaign.router,
      campaigns: this.campaign.router,
      cms: this.cms.router,
      security: this.security.router,
      analytics: this.analytics.router,
      event: this.event.router,
      events: this.event.router,
      level: this.level.router,
      groupAudio: this.groupAudio.router,
      party: this.party.router,
      social: this.social.router,
      config: this.config.router,
      presence: this.presence.router,
      support: this.support.router,
      compliance: this.compliance.router,
      payouts: this.payouts.router,
      pk: this.pk.router,
      leaderboards: this.leaderboards.router,
    } as any);
  }
}

export type AppRouter = TrpcRouter["appRouter"];
