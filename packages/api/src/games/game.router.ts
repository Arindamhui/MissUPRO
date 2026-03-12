import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { GameService } from "./game.service";
import { startInCallGameSchema, submitMoveSchema } from "@missu/types";

@Injectable()
export class GameRouter {
  constructor(private readonly trpc: TrpcService, private readonly gameService: GameService) {}

  get router() {
    return this.trpc.router({
      startInCallGame: this.trpc.protectedProcedure
        .input(startInCallGameSchema)
        .mutation(async ({ ctx, input }) => this.gameService.startInCallGame(input.callSessionId, input.gameType, ctx.userId)),

      submitMove: this.trpc.protectedProcedure
        .input(submitMoveSchema)
        .mutation(async ({ ctx, input }) => this.gameService.submitMove(input.sessionId, ctx.userId, input.move)),

      getGameState: this.trpc.protectedProcedure
        .input(z.object({ sessionId: z.string().uuid() }))
        .query(async ({ input }) => this.gameService.getGameState(input.sessionId)),

      endSession: this.trpc.protectedProcedure
        .input(z.object({ sessionId: z.string().uuid() }))
        .mutation(async ({ input }) => this.gameService.endSession(input.sessionId)),
    });
  }
}
