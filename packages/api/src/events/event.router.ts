import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { EventService } from "./event.service";

@Injectable()
export class EventRouter {
  constructor(private readonly trpc: TrpcService, private readonly eventService: EventService) {}

  get router() {
    return this.trpc.router({
      // Events
      listEvents: this.trpc.protectedProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ input }) => this.eventService.listEvents(input.status, input.cursor, input.limit)),

      createEvent: this.trpc.adminProcedure
        .input(z.object({ title: z.string(), description: z.string(), eventType: z.string(), startDate: z.coerce.date(), endDate: z.coerce.date(), rulesJson: z.any().optional(), rewardPoolJson: z.any().optional() }))
        .mutation(async ({ ctx, input }) => this.eventService.createEvent(input, ctx.userId)),

      updateEvent: this.trpc.adminProcedure
        .input(z.object({ eventId: z.string().uuid(), data: z.record(z.string(), z.any()) }))
        .mutation(async ({ input }) => this.eventService.updateEvent(input.eventId, input.data)),

      getEventDetail: this.trpc.protectedProcedure
        .input(z.object({ eventId: z.string().uuid() }))
        .query(async ({ input }) => this.eventService.getEventDetail(input.eventId)),

      joinEvent: this.trpc.protectedProcedure
        .input(z.object({ eventId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.eventService.joinEvent(ctx.userId, input.eventId)),

      getEventLeaderboard: this.trpc.protectedProcedure
        .input(z.object({ eventId: z.string().uuid(), limit: z.number().int().min(1).max(100).default(50) }))
        .query(async ({ input }) => this.eventService.getEventLeaderboard(input.eventId, input.limit)),

      // Leaderboards
      listLeaderboards: this.trpc.protectedProcedure
        .query(async () => this.eventService.listLeaderboards()),

      getLeaderboard: this.trpc.protectedProcedure
        .input(z.object({ leaderboardId: z.string().uuid(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) }))
        .query(async ({ input }) => this.eventService.getLeaderboard(input.leaderboardId, input.cursor, input.limit)),

      createLeaderboard: this.trpc.adminProcedure
        .input(z.object({ title: z.string(), leaderboardType: z.string(), scoringMetric: z.string(), windowType: z.string() }))
        .mutation(async ({ ctx, input }) => this.eventService.createLeaderboard(input, ctx.userId)),

      recomputeLeaderboard: this.trpc.adminProcedure
        .input(z.object({ leaderboardId: z.string().uuid() }))
        .mutation(async ({ input }) => this.eventService.recomputeLeaderboard(input.leaderboardId)),
    });
  }
}
