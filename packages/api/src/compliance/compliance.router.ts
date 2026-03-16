import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { ComplianceService } from "./compliance.service";

@Injectable()
export class ComplianceRouter {
  constructor(private readonly trpc: TrpcService, private readonly complianceService: ComplianceService) {}

  get router() {
    return this.trpc.router({
      requestAccountDeletion: this.trpc.protectedProcedure
        .input(z.object({ reason: z.string().min(5).max(1000) }))
        .mutation(async ({ ctx, input }) => this.complianceService.requestAccountDeletion(ctx.userId, input.reason)),

      getMyDeletionRequest: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.complianceService.getMyDeletionRequest(ctx.userId)),

      requestDataExport: this.trpc.protectedProcedure
        .mutation(async ({ ctx }) => this.complianceService.requestDataExport(ctx.userId)),

      listMyDataExports: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.complianceService.listMyDataExports(ctx.userId)),

      getMyDataExport: this.trpc.protectedProcedure
        .input(z.object({ requestId: z.string().uuid() }))
        .query(async ({ ctx, input }) => this.complianceService.getMyDataExport(ctx.userId, input.requestId)),

      listDeletionRequests: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional() }).optional())
        .query(async ({ input }) => this.complianceService.listDeletionRequests(input?.status)),

      listDataExportRequests: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional() }).optional())
        .query(async ({ input }) => this.complianceService.listDataExportRequests(input?.status)),

      processDataExportRequest: this.trpc.adminProcedure
        .input(z.object({ requestId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.complianceService.processDataExportRequest(input.requestId, ctx.userId)),

      runRetentionSweep: this.trpc.adminProcedure
        .mutation(async () => this.complianceService.runRetentionSweep()),

      processDeletionRequest: this.trpc.adminProcedure
        .input(
          z.object({
            requestId: z.string().uuid(),
            action: z.enum(["COMPLETED", "CANCELLED", "LEGAL_HOLD"]),
          }),
        )
        .mutation(async ({ ctx, input }) =>
          this.complianceService.processDeletionRequest(input.requestId, ctx.userId, input.action),
        ),
    });
  }
}
