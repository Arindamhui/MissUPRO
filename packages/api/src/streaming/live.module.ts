import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { GiftsModule } from "../gifts/gifts.module";
import { PkModule } from "../pk/pk.module";
import { WalletModule } from "../wallet/wallet.module";
import { LiveService } from "./live.service";
import { LiveRouter } from "./live.router";
import { RtcTokenService } from "./rtc-token.service";

@Module({
  imports: [PkModule, ConfigModule, GiftsModule, WalletModule],
  providers: [LiveService, LiveRouter, RtcTokenService],
  exports: [LiveService, LiveRouter, RtcTokenService],
})
export class LiveModule {}
