import { Module } from "@nestjs/common";
import { GiftService } from "./gift.service";
import { GiftRouter } from "./gift.router";
import { WalletModule } from "../wallet/wallet.module";

@Module({ imports: [WalletModule], providers: [GiftService, GiftRouter], exports: [GiftService, GiftRouter] })
export class GiftsModule {}
