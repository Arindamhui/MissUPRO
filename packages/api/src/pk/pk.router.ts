import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { PkService } from "./pk.service";
import { requestPKBattleSchema, acceptPKBattleSchema } from "@missu/types";

@Injectable()
export class PkRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly pkService: PkService,
  ) {}

  get router() {
    return this.trpc.router({
      requestPKBattle: this.trpc.protectedProcedure
        .input(requestPKBattleSchema)
        .mutation(async ({ ctx, input }) => {
          return this.pkService.requestPKBattle(ctx.userId, input.opponentHostId);
        }),

      acceptPKBattle: this.trpc.protectedProcedure
        .input(acceptPKBattleSchema)
        .mutation(async ({ ctx, input }) => {
          return this.pkService.acceptPKBattle(input.pkSessionId, ctx.userId);
        }),

      getPKBattleState: this.trpc.protectedProcedure
        .input(z.object({ pkSessionId: z.string().uuid() }))
        .query(async ({ input }) => {
          return this.pkService.getPKBattleState(input.pkSessionId);
        }),

      getPKBattleRealtimeState: this.trpc.protectedProcedure
        .input(z.object({ pkSessionId: z.string().uuid(), limit: z.number().int().min(1).max(100).optional() }))
        .query(async ({ input }) => {
          return this.pkService.getPKBattleRealtimeState(input.pkSessionId, input.limit ?? 20);
        }),

      myBattles: this.trpc.protectedProcedure
        .input(z.object({
          statuses: z.array(z.enum(["CREATED", "MATCHING", "ACTIVE", "VOTING", "ENDED", "CANCELLED"])).optional(),
          limit: z.number().int().min(1).max(50).default(10),
        }).optional())
        .query(async ({ ctx, input }) => {
          return this.pkService.listMyBattles(ctx.userId, input?.statuses, input?.limit ?? 10);
        }),

      getConfig: this.trpc.procedure.query(async () => this.pkService.getConfig()),
    });
  }
}
