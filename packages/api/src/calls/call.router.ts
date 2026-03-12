import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { CallService } from "./call.service";
import { requestModelCallSchema, acceptModelCallSchema, endModelCallSchema } from "@missu/types";

@Injectable()
export class CallRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly callService: CallService,
  ) {}

  get router() {
    return this.trpc.router({
      requestModelCall: this.trpc.protectedProcedure
        .input(requestModelCallSchema)
        .mutation(async ({ ctx, input }) => {
          return this.callService.requestCall(ctx.userId, input.modelUserId, input.callType);
        }),

      acceptModelCall: this.trpc.protectedProcedure
        .input(acceptModelCallSchema)
        .mutation(async ({ ctx, input }) => {
          return this.callService.acceptCall(input.callSessionId, ctx.userId);
        }),

      endModelCall: this.trpc.protectedProcedure
        .input(endModelCallSchema)
        .mutation(async ({ input }) => {
          return this.callService.endCall(input.callSessionId, input.reason);
        }),

      getBillingState: this.trpc.protectedProcedure
        .input(z.object({ callSessionId: z.string().uuid() }))
        .query(async ({ input }) => {
          return this.callService.getBillingState(input.callSessionId);
        }),
    });
  }
}
