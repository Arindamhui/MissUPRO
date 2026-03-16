import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { PkModule } from "../pk/pk.module";
import { GiftService } from "./gift.service";
import { GiftRouter } from "./gift.router";

@Module({
  imports: [WalletModule, PkModule],
  providers: [GiftService, GiftRouter],
  exports: [GiftService, GiftRouter],
})
export class GiftsModule {}
