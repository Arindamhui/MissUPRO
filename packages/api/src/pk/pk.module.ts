import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { PkService } from "./pk.service";
import { PkRouter } from "./pk.router";

@Module({
  imports: [ConfigModule],
  providers: [PkService, PkRouter],
  exports: [PkService, PkRouter],
})
export class PkModule {}
