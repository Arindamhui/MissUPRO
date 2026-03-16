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

      submitReport: this.trpc.protectedProcedure
        .input(z.object({
          entityType: z.enum(["USER", "LIVE_STREAM", "DM_MESSAGE", "CALL_SESSION", "GIFT_TRANSACTION", "PAYMENT", "MEDIA_ASSET", "COMMENT"]),
          entityId: z.string().uuid(),
          reasonCode: z.string().min(2).max(120),
          description: z.string().max(2000).optional(),
          evidenceJson: z.record(z.string(), z.unknown()).optional(),
        }))
        .mutation(async ({ ctx, input }) => this.moderationService.submitReport(ctx.userId, input)),

      listReports: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), entityType: z.string().optional(), limit: z.number().int().min(1).max(200).default(100) }).optional())
        .query(async ({ input }) => this.moderationService.listReports(input ?? {})),

      reviewReport: this.trpc.adminProcedure
        .input(z.object({
          reportId: z.string().uuid(),
          status: z.enum(["UNDER_REVIEW", "ACTIONED", "DISMISSED", "RESOLVED"]),
          resolutionNotes: z.string().max(1000).optional(),
        }))
        .mutation(async ({ ctx, input }) => this.moderationService.reviewReport(input.reportId, ctx.userId, input.status, input.resolutionNotes)),

      listBans: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), scope: z.string().optional(), limit: z.number().int().min(1).max(200).default(100) }).optional())
        .query(async ({ input }) => this.moderationService.listBans(input ?? {})),

      imposeBan: this.trpc.adminProcedure
        .input(z.object({
          userId: z.string().uuid(),
          scope: z.enum(["ACCOUNT", "LIVE", "DM", "CALL", "WITHDRAWAL"]),
          reason: z.enum(["HARASSMENT", "SPAM", "FRAUD", "CHARGEBACK_ABUSE", "SELF_GIFTING", "UNDERAGE_RISK", "POLICY_VIOLATION", "OTHER"]),
          sourceReportId: z.string().uuid().optional(),
          notes: z.string().max(1000).optional(),
          endsAt: z.coerce.date().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => this.moderationService.imposeBan(ctx.userId, input)),

      revokeBan: this.trpc.adminProcedure
        .input(z.object({ banId: z.string().uuid(), notes: z.string().max(1000).optional() }))
        .mutation(async ({ ctx, input }) => this.moderationService.revokeBan(input.banId, ctx.userId, input.notes)),

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
