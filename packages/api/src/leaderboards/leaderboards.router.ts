import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { LeaderboardsService } from "./leaderboards.service";

@Injectable()
export class LeaderboardsRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly leaderboardsService: LeaderboardsService,
  ) {}

  get router() {
    return this.trpc.router({
      list: this.trpc.procedure
        .input(z.object({ status: z.string().optional() }).optional())
        .query(async ({ input }) => this.leaderboardsService.listLeaderboards(input?.status)),

      get: this.trpc.procedure
        .input(z.object({ leaderboardId: z.string().uuid() }))
        .query(async ({ input }) => this.leaderboardsService.getLeaderboard(input.leaderboardId)),

      getEntries: this.trpc.procedure
        .input(z.object({
          leaderboardId: z.string().uuid(),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        }))
        .query(async ({ input }) =>
          this.leaderboardsService.getEntries(input.leaderboardId, input.cursor, input.limit)),

      getSnapshots: this.trpc.procedure
        .input(z.object({
          leaderboardId: z.string().uuid(),
          limit: z.number().int().min(1).max(100).default(30),
        }))
        .query(async ({ input }) =>
          this.leaderboardsService.getSnapshots(input.leaderboardId, input.limit)),

      refresh: this.trpc.procedure
        .input(z.object({ leaderboardId: z.string().uuid() }))
        .mutation(async ({ input }) => this.leaderboardsService.refreshLeaderboard(input.leaderboardId)),
    });
  }
}
