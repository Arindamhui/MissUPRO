import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { WalletModule } from "../wallet/wallet.module";
import { PkModule } from "../pk/pk.module";
import { LevelsModule } from "../levels/levels.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { GiftService } from "./gift.service";
import { GiftRouter } from "./gift.router";

@Module({
  imports: [ConfigModule, WalletModule, PkModule, LevelsModule, NotificationsModule],
  providers: [GiftService, GiftRouter],
  exports: [GiftService, GiftRouter],
})
export class GiftsModule {}
