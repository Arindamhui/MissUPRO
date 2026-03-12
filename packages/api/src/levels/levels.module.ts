import { Module } from "@nestjs/common";
import { LevelService } from "./level.service";
import { LevelRouter } from "./level.router";

@Module({
  providers: [LevelService, LevelRouter],
  exports: [LevelRouter, LevelService],
})
export class LevelsModule {}
