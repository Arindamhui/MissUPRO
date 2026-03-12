import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { AnalyticsService } from "./analytics.service";

@Injectable()
export class AnalyticsRouter {
  constructor(private readonly trpc: TrpcService, private readonly analyticsService: AnalyticsService) {}

  get router() {
    return this.trpc.router({
      trackEvent: this.trpc.protectedProcedure
        .input(z.object({ eventType: z.string(), properties: z.record(z.any()).default({}) }))
        .mutation(async ({ ctx, input }) =>
          this.analyticsService.trackEvent(ctx.userId, input.eventType, input.properties),
        ),

      getEngagementMetrics: this.trpc.adminProcedure
        .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
        .query(async ({ input }) =>
          this.analyticsService.getEngagementMetrics(input.startDate, input.endDate),
        ),

      getRevenueAnalytics: this.trpc.adminProcedure
        .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
        .query(async ({ input }) =>
          this.analyticsService.getRevenueAnalytics(input.startDate, input.endDate),
        ),

      getUserPaymentHistory: this.trpc.adminProcedure
        .input(z.object({ userId: z.string().uuid() }))
        .query(async ({ input }) => this.analyticsService.getUserPaymentHistory(input.userId)),

      getModelEarningsReport: this.trpc.adminProcedure
        .input(z.object({ modelUserId: z.string().uuid(), startDate: z.coerce.date(), endDate: z.coerce.date() }))
        .query(async ({ input }) =>
          this.analyticsService.getModelEarningsReport(input.modelUserId, input.startDate, input.endDate),
        ),
    });
  }
}
