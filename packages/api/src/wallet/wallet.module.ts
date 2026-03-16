import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { WalletService } from "./wallet.service";
import { WalletRouter } from "./wallet.router";

@Module({
  imports: [ConfigModule],
  providers: [WalletService, WalletRouter],
  exports: [WalletService, WalletRouter],
})
export class WalletModule {}
