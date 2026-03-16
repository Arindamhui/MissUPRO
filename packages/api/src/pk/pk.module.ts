import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { WalletModule } from "../wallet/wallet.module";
import { PkService } from "./pk.service";
import { PkRouter } from "./pk.router";

@Module({
  imports: [ConfigModule, WalletModule],
  providers: [PkService, PkRouter],
  exports: [PkService, PkRouter],
})
export class PkModule {}
