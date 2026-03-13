import { Module } from "@nestjs/common";
import { PresenceService } from "./presence.service";
import { PresenceRouter } from "./presence.router";

@Module({
  providers: [PresenceService, PresenceRouter],
  exports: [PresenceService, PresenceRouter],
})
export class PresenceModule {}
