import { Module } from "@nestjs/common";
import { VipService } from "./vip.service";
import { VipRouter } from "./vip.router";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [WalletModule],
  providers: [VipService, VipRouter],
  exports: [VipRouter, VipService],
})
export class VipModule {}
