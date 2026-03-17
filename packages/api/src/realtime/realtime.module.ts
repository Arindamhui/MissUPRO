import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { PresenceService } from "./presence.service";
import { RealtimeAuthGuard } from "./realtime-auth.guard";
import { AuthModule } from "../auth/auth.module";
import { PartyModule } from "../party/party.module";
import { GroupAudioModule } from "../group-audio/group-audio.module";
import { LiveModule } from "../streaming/live.module";
import { GamesModule } from "../games/games.module";
import { CallsModule } from "../calls/calls.module";
import { SocialModule } from "../social/social.module";
import { ModerationModule } from "../moderation/moderation.module";

@Module({
  imports: [AuthModule, PartyModule, GroupAudioModule, LiveModule, GamesModule, CallsModule, SocialModule, ModerationModule],
  providers: [RealtimeGateway, PresenceService, RealtimeAuthGuard],
  exports: [RealtimeGateway, PresenceService],
})
export class RealtimeModule {}
