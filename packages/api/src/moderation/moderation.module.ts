import { Module } from "@nestjs/common";
import { ModerationService } from "./moderation.service";
import { ModerationRouter } from "./moderation.router";

@Module({
  providers: [ModerationService, ModerationRouter],
  exports: [ModerationRouter, ModerationService],
})
export class ModerationModule {}
