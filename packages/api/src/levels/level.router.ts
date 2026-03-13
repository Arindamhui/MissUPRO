import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { LevelService } from "./level.service";

@Injectable()
export class LevelRouter {
  constructor(private readonly trpc: TrpcService, private readonly levelService: LevelService) {}

  get router() {
    return this.trpc.router({
      getUserLevel: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.levelService.getUserLevel(ctx.userId)),

      recordDailyLogin: this.trpc.protectedProcedure
        .mutation(async ({ ctx }) => this.levelService.recordDailyLogin(ctx.userId)),

      getLoginStreak: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.levelService.getLoginStreak(ctx.userId)),

      getUserBadges: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.levelService.getUserBadges(ctx.userId)),

      listAllBadges: this.trpc.protectedProcedure
        .query(async () => this.levelService.listAllBadges()),

      listAllLevels: this.trpc.protectedProcedure
        .query(async () => this.levelService.listAllLevels()),

      recalculateModelLevel: this.trpc.adminProcedure
        .input(z.object({ modelUserId: z.string().uuid() }))
        .mutation(async ({ input }) => this.levelService.recalculateModelLevel(input.modelUserId, "ADMIN_OVERRIDE")),

      recalculateAllModelLevels: this.trpc.adminProcedure
        .input(z.object({ limit: z.number().int().min(1).max(1000).default(200) }).optional())
        .mutation(async ({ input }) => this.levelService.recalculateAllModelLevels(input?.limit ?? 200)),

      getModelLevelDistribution: this.trpc.adminProcedure
        .query(async () => this.levelService.getModelLevelDistribution()),
    });
  }
}
