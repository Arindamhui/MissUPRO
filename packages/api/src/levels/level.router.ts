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
    });
  }
}
