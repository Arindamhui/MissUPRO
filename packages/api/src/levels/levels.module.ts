import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { LevelService } from "./level.service";
import { LevelRouter } from "./level.router";

@Module({
  imports: [ConfigModule],
  providers: [LevelService, LevelRouter],
  exports: [LevelRouter, LevelService],
})
export class LevelsModule {}
