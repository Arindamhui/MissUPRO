import { Module } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { ConfigRouter } from "./config.router";

@Module({
  providers: [ConfigService, ConfigRouter],
  exports: [ConfigService, ConfigRouter],
})
export class ConfigModule {}
