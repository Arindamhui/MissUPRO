import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsRouter } from "./analytics.router";

@Module({
  providers: [AnalyticsService, AnalyticsRouter],
  exports: [AnalyticsRouter, AnalyticsService],
})
export class AnalyticsModule {}
