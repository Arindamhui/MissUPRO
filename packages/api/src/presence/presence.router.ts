import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { PresenceService } from "./presence.service";

@Injectable()
export class PresenceRouter {
  constructor(private readonly trpc: TrpcService, private readonly presenceService: PresenceService) {}

  get router() {
    return this.trpc.router({
      heartbeat: this.trpc.protectedProcedure
        .input(z.object({ status: z.enum(["ONLINE", "IDLE", "IN_CALL", "IN_LIVE"]).default("ONLINE") }))
        .mutation(async ({ ctx, input }) => this.presenceService.heartbeat(ctx.userId, input.status)),

      getStatus: this.trpc.protectedProcedure
        .input(z.object({ userId: z.string().uuid() }))
        .query(async ({ input }) => this.presenceService.getStatus(input.userId)),

      getBulk: this.trpc.protectedProcedure
        .input(z.object({ userIds: z.array(z.string().uuid()).max(100) }))
        .query(async ({ input }) => this.presenceService.getBulk(input.userIds)),
    });
  }
}
