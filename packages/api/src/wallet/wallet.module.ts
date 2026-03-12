import { Module } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { WalletRouter } from "./wallet.router";

@Module({
  providers: [WalletService, WalletRouter],
  exports: [WalletService, WalletRouter],
})
export class WalletModule {}
