import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { PaymentService } from "./payment.service";
import { createPaymentIntentSchema, verifyWebhookEventSchema } from "@missu/types";

@Injectable()
export class PaymentRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly paymentService: PaymentService,
  ) {}

  get router() {
    return this.trpc.router({
      createPaymentIntent: this.trpc.protectedProcedure
        .input(createPaymentIntentSchema)
        .mutation(async ({ ctx, input }) => {
          return this.paymentService.createPaymentIntent(ctx.userId, input.coinPackageId, input.provider, input.idempotencyKey);
        }),

      verifyAndStoreWebhookEvent: this.trpc.procedure
        .input(verifyWebhookEventSchema)
        .mutation(async ({ input }) => {
          return this.paymentService.verifyWebhookEvent(input.provider, input.payload, input.signature);
        }),

      getPaymentDetail: this.trpc.adminProcedure
        .input(z.object({ paymentId: z.string().uuid() }))
        .query(async ({ input }) => this.paymentService.getPaymentDetail(input.paymentId)),

      listWebhookEvents: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) }).optional())
        .query(async ({ input }) => this.paymentService.listWebhookEvents(input?.cursor, input?.limit ?? 50)),

      listPaymentDisputes: this.trpc.adminProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50), status: z.string().optional() }).optional())
        .query(async ({ input }) => this.paymentService.listPaymentDisputes(input?.cursor, input?.limit ?? 50, input?.status)),

      openPaymentDispute: this.trpc.adminProcedure
        .input(z.object({
          paymentId: z.string().uuid(),
          providerDisputeId: z.string().min(3),
          disputeReason: z.string().min(3).max(500),
          amountUsd: z.number().positive().optional(),
          metadataJson: z.record(z.string(), z.unknown()).optional(),
        }))
        .mutation(async ({ ctx, input }) =>
          this.paymentService.openPaymentDispute(
            input.paymentId,
            input.providerDisputeId,
            input.disputeReason,
            input.amountUsd ?? null,
            input.metadataJson,
            ctx.userId,
          ),
        ),

      resolvePaymentDispute: this.trpc.adminProcedure
        .input(z.object({
          disputeId: z.string().uuid(),
          status: z.enum(["UNDER_REVIEW", "WON", "LOST", "RESOLVED"]),
          resolutionNotes: z.string().max(1000).optional(),
        }))
        .mutation(async ({ input }) =>
          this.paymentService.resolvePaymentDispute(input.disputeId, input.status, input.resolutionNotes),
        ),

      runPaymentReconciliation: this.trpc.adminProcedure
        .input(z.object({ limit: z.number().int().min(1).max(1000).default(500) }).optional())
        .query(async ({ input }) => this.paymentService.runPaymentReconciliation(input?.limit ?? 500)),
    });
  }
}
