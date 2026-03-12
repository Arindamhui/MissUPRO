import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { LiveService } from "./live.service";
import { requestPKBattleSchema, acceptPKBattleSchema } from "@missu/types";

@Injectable()
export class LiveRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly liveService: LiveService,
  ) {}

  get router() {
    return this.trpc.router({
      requestPKBattle: this.trpc.protectedProcedure
        .input(requestPKBattleSchema)
        .mutation(async ({ ctx, input }) => {
          return this.liveService.requestPKBattle(ctx.userId, input.opponentHostId);
        }),

      acceptPKBattle: this.trpc.protectedProcedure
        .input(acceptPKBattleSchema)
        .mutation(async ({ ctx, input }) => {
          return this.liveService.acceptPKBattle(input.pkSessionId, ctx.userId);
        }),

      getPKBattleState: this.trpc.protectedProcedure
        .input(z.object({ pkSessionId: z.string().uuid() }))
        .query(async ({ input }) => {
          return this.liveService.getPKBattleState(input.pkSessionId);
        }),
    });
  }
}
