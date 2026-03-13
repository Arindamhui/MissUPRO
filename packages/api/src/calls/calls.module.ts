import { Module } from "@nestjs/common";
import { CallService } from "./call.service";
import { CallRouter } from "./call.router";
import { RtcTokenService } from "../streaming/rtc-token.service";

@Module({
  providers: [CallService, CallRouter, RtcTokenService],
  exports: [CallService, CallRouter],
})
export class CallsModule {}
