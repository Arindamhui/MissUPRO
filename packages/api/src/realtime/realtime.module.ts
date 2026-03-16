import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { PresenceService } from "./presence.service";
import { RealtimeAuthGuard } from "./realtime-auth.guard";
import { RealtimeStateService } from "./realtime-state.service";
import { PartyModule } from "../party/party.module";
import { GroupAudioModule } from "../group-audio/group-audio.module";
import { LiveModule } from "../streaming/live.module";
import { GamesModule } from "../games/games.module";
import { CallsModule } from "../calls/calls.module";
import { SocialModule } from "../social/social.module";
import { ModerationModule } from "../moderation/moderation.module";

@Module({
  imports: [PartyModule, GroupAudioModule, LiveModule, GamesModule, CallsModule, SocialModule, ModerationModule],
  providers: [RealtimeGateway, PresenceService, RealtimeAuthGuard, RealtimeStateService],
  exports: [RealtimeGateway, PresenceService, RealtimeStateService],
})
export class RealtimeModule {}
