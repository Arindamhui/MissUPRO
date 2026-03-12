import { Module } from "@nestjs/common";
import { MediaService } from "./media.service";
import { MediaRouter } from "./media.router";

@Module({
  providers: [MediaService, MediaRouter],
  exports: [MediaRouter, MediaService],
})
export class MediaModule {}
