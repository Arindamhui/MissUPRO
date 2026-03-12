import { Module } from "@nestjs/common";
import { GroupAudioService } from "./group-audio.service";
import { GroupAudioRouter } from "./group-audio.router";

@Module({
  providers: [GroupAudioService, GroupAudioRouter],
  exports: [GroupAudioRouter, GroupAudioService],
})
export class GroupAudioModule {}
