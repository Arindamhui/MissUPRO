import { Module } from "@nestjs/common";
import { CallService } from "./call.service";
import { CallRouter } from "./call.router";
import { ModelsModule } from "../models/models.module";
import { RtcTokenService } from "../streaming/rtc-token.service";

@Module({
  imports: [ModelsModule],
  providers: [CallService, CallRouter, RtcTokenService],
  exports: [CallService, CallRouter],
})
export class CallsModule {}
