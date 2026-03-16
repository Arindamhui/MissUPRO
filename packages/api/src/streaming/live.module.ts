import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { GiftsModule } from "../gifts/gifts.module";
import { PkModule } from "../pk/pk.module";
import { WalletModule } from "../wallet/wallet.module";
import { LevelsModule } from "../levels/levels.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { LiveService } from "./live.service";
import { LiveRouter } from "./live.router";
import { RtcTokenService } from "./rtc-token.service";

@Module({
  imports: [PkModule, ConfigModule, GiftsModule, WalletModule, LevelsModule, NotificationsModule],
  providers: [LiveService, LiveRouter, RtcTokenService],
  exports: [LiveService, LiveRouter, RtcTokenService],
})
export class LiveModule {}
