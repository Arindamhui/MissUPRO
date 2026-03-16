import { Module } from "@nestjs/common";
import { CallService } from "./call.service";
import { CallRouter } from "./call.router";
import { ModelsModule } from "../models/models.module";
import { RtcTokenService } from "../streaming/rtc-token.service";
import { WalletModule } from "../wallet/wallet.module";
import { ConfigModule } from "../config/config.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [ModelsModule, WalletModule, ConfigModule, NotificationsModule],
  providers: [CallService, CallRouter, RtcTokenService],
  exports: [CallService, CallRouter],
})
export class CallsModule {}
