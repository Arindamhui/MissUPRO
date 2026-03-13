import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { PayoutsService } from "./payouts.service";

@Injectable()
export class PayoutsRouter {
  constructor(private readonly trpc: TrpcService, private readonly payoutsService: PayoutsService) {}

  get router() {
    return this.trpc.router({
      listWithdrawRequests: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) }).optional())
        .query(async ({ input }) => this.payoutsService.listWithdrawRequests(input?.status, input?.limit ?? 50)),

      getModelMinuteSummary: this.trpc.adminProcedure
        .input(z.object({ modelUserId: z.string().uuid() }))
        .query(async ({ input }) => this.payoutsService.getModelMinuteSummary(input.modelUserId)),

      calculateModelPayout: this.trpc.adminProcedure
        .input(z.object({ modelUserId: z.string().uuid(), audioRateUsd: z.number().positive(), videoRateUsd: z.number().positive() }))
        .query(async ({ input }) => this.payoutsService.calculateModelPayout(input.modelUserId, input.audioRateUsd, input.videoRateUsd)),

      approveMinutePayout: this.trpc.adminProcedure
        .input(z.object({ withdrawRequestId: z.string().uuid(), audioRateUsd: z.number().positive(), videoRateUsd: z.number().positive() }))
        .mutation(async ({ ctx, input }) =>
          this.payoutsService.approveMinutePayout(input.withdrawRequestId, ctx.userId, input.audioRateUsd, input.videoRateUsd),
        ),
    });
  }
}
