import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { PresenceService } from "./presence.service";
import { RealtimeAuthGuard } from "./realtime-auth.guard";

@Module({
  providers: [RealtimeGateway, PresenceService, RealtimeAuthGuard],
  exports: [RealtimeGateway, PresenceService],
})
export class RealtimeModule {}
