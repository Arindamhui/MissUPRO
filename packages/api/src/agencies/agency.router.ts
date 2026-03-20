import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { AgencyService } from "./agency.service";

@Injectable()
export class AgencyRouter {
  constructor(private readonly trpc: TrpcService, private readonly agencyService: AgencyService) {}

  get router() {
    return this.trpc.router({
      submitApplication: this.trpc.protectedProcedure
        .input(z.object({
          name: z.string().min(2).max(100),
          contactName: z.string().min(2).max(100),
          contactEmail: z.string().email(),
          country: z.string().min(2).max(100),
          notes: z.string().max(1000).optional(),
        }))
        .mutation(async ({ ctx, input }) => this.agencyService.submitApplication(ctx.userId, input)),

      listMyApplications: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.agencyService.listMyApplications(ctx.userId)),

      applyAsAgency: this.trpc.protectedProcedure
        .input(z.object({
          name: z.string().min(2).max(100),
          contactName: z.string().min(2).max(100),
          contactEmail: z.string().email(),
          country: z.string().min(2).max(100),
        }))
        .mutation(async ({ ctx, input }) => this.agencyService.applyAsAgency(ctx.userId, input)),

      listPublicSquads: this.trpc.procedure
        .input(z.object({ view: z.enum(["POPULAR", "RANK"]).default("POPULAR"), limit: z.number().int().min(1).max(50).default(20) }).optional())
        .query(async ({ input }) => this.agencyService.listPublicSquads(input?.view ?? "POPULAR", input?.limit ?? 20)),

      getMySquadOverview: this.trpc.agencyProcedure
        .query(async ({ ctx }) => this.agencyService.getMySquadOverview(ctx.userId)),

      joinSquad: this.trpc.agencyProcedure
        .input(z.object({ agencyId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.agencyService.joinSquad(ctx.userId, input.agencyId)),

      getAgencyDashboard: this.trpc.agencyProcedure
        .query(async ({ ctx }) => this.agencyService.getAgencyDashboard(ctx.userId)),

      inviteHost: this.trpc.agencyProcedure
        .input(z.object({ hostUserId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.agencyService.inviteHost(ctx.userId, input.hostUserId)),

      acceptInvite: this.trpc.agencyProcedure
        .input(z.object({ agencyId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.agencyService.acceptInvite(ctx.userId, input.agencyId)),

      getHostRoster: this.trpc.agencyProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ ctx, input }) => this.agencyService.getHostRoster(ctx.userId, input.cursor, input.limit)),

      getCommissionSummary: this.trpc.agencyProcedure
        .query(async ({ ctx }) => this.agencyService.getCommissionSummary(ctx.userId)),

      removeHost: this.trpc.agencyProcedure
        .input(z.object({ hostUserId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.agencyService.removeHost(ctx.userId, input.hostUserId)),

      listAgencyApplications: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ input }) => this.agencyService.listAgencyApplications(input?.status, input?.cursor, input?.limit ?? 20)),

      approveAgencyApplication: this.trpc.adminProcedure
        .input(z.object({ applicationId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.agencyService.approveAgencyApplication(input.applicationId, ctx.userId)),

      rejectAgencyApplication: this.trpc.adminProcedure
        .input(z.object({ applicationId: z.string().uuid(), notes: z.string().max(1000).optional() }))
        .mutation(async ({ ctx, input }) => this.agencyService.rejectAgencyApplication(input.applicationId, ctx.userId, input.notes)),

      recordCommission: this.trpc.adminProcedure
        .input(z.object({
          agencyId: z.string().uuid(),
          hostUserId: z.string().uuid(),
          grossRevenueUsd: z.number().nonnegative(),
          hostPayoutUsd: z.number().nonnegative(),
          commissionRate: z.number().min(0).max(1),
          metadataJson: z.record(z.string(), z.unknown()).optional(),
        }))
        .mutation(async ({ ctx, input }) =>
          this.agencyService.recordCommission(
            input.agencyId,
            input.hostUserId,
            input.grossRevenueUsd,
            input.hostPayoutUsd,
            input.commissionRate,
            ctx.userId,
            input.metadataJson,
          ),
        ),
    });
  }
}
