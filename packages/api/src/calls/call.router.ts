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

      getCallPricingPreview: this.trpc.protectedProcedure
        .input(z.object({ modelUserId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.callService.getPricingPreview(ctx.userId, input.modelUserId);
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

      myCallHistory: this.trpc.protectedProcedure
        .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
        .query(async ({ ctx, input }) => {
          return this.callService.listMyCallHistory(ctx.userId, input?.limit ?? 30);
        }),

      listCallHistory: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), callType: z.string().optional(), limit: z.number().int().min(1).max(200).default(100) }).optional())
        .query(async ({ input }) => this.callService.listCallHistory(input ?? {})),

      getOperationsReport: this.trpc.adminProcedure
        .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
        .query(async ({ input }) => this.callService.getCallOperationsReport(input.startDate, input.endDate)),

      refreshRtcToken: this.trpc.protectedProcedure
        .input(z.object({ callSessionId: z.string().uuid(), role: z.enum(["publisher", "subscriber"]).default("subscriber") }))
        .mutation(async ({ input }) => {
          return this.callService.refreshRtcToken(input.callSessionId, input.role);
        }),
    });
  }
}
