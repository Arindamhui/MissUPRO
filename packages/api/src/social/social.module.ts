import { Module } from "@nestjs/common";
import { SocialService } from "./social.service";
import { SocialRouter } from "./social.router";

@Module({
  providers: [SocialService, SocialRouter],
  exports: [SocialService, SocialRouter],
})
export class SocialModule {}
