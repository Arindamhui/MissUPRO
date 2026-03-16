import { Module } from "@nestjs/common";
import { LeaderboardsService } from "./leaderboards.service";
import { LeaderboardsRouter } from "./leaderboards.router";

@Module({
  providers: [LeaderboardsService, LeaderboardsRouter],
  exports: [LeaderboardsService, LeaderboardsRouter],
})
export class LeaderboardsModule {}
