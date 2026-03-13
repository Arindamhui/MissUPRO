import { Module } from "@nestjs/common";
import { LiveService } from "./live.service";
import { LiveRouter } from "./live.router";
import { RtcTokenService } from "./rtc-token.service";

@Module({ providers: [LiveService, LiveRouter, RtcTokenService], exports: [LiveService, LiveRouter, RtcTokenService] })
export class LiveModule {}
