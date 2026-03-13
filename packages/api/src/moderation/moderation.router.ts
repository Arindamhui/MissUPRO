import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { ModerationService } from "./moderation.service";

@Injectable()
export class ModerationRouter {
  constructor(private readonly trpc: TrpcService, private readonly moderationService: ModerationService) {}

  get router() {
    return this.trpc.router({
      evaluateChatMessage: this.trpc.protectedProcedure
        .input(z.object({
          message: z.string().min(1).max(5000),
          context: z.object({ roomType: z.string(), roomId: z.string().uuid() }),
        }))
        .mutation(async ({ ctx, input }) =>
          this.moderationService.evaluateChatMessage(input.message, ctx.userId, input.context),
        ),

      getContentReport: this.trpc.adminProcedure
        .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
        .query(async ({ input }) =>
          this.moderationService.getContentReport(input.startDate, input.endDate),
        ),

      reportSevereViolation: this.trpc.adminProcedure
        .input(
          z.object({
            userId: z.string().uuid(),
            category: z.enum(["CSAM", "TERROR", "EXTREME_VIOLENCE"]),
            evidence: z.object({ assetId: z.string().uuid().optional(), note: z.string().max(1000).optional() }).optional(),
          }),
        )
        .mutation(async ({ input }) =>
          this.moderationService.reportSevereViolation(input.userId, input.category, input.evidence ?? {}),
        ),
    });
  }
}
