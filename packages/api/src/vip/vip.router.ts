import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { VipService } from "./vip.service";

@Injectable()
export class VipRouter {
  constructor(private readonly trpc: TrpcService, private readonly vipService: VipService) {}

  get router() {
    return this.trpc.router({
      getAvailableTiers: this.trpc.protectedProcedure
        .query(async () => this.vipService.getAvailableTiers()),

      subscribe: this.trpc.protectedProcedure
        .input(z.object({ tierId: z.string() }))
        .mutation(async ({ ctx, input }) => this.vipService.subscribe(ctx.userId, input.tierId)),

      cancelSubscription: this.trpc.protectedProcedure
        .mutation(async ({ ctx }) => this.vipService.cancelSubscription(ctx.userId)),

      getMySubscription: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.vipService.getMySubscription(ctx.userId)),
    });
  }
}
