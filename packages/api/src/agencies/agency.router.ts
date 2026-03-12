import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { AgencyService } from "./agency.service";

@Injectable()
export class AgencyRouter {
  constructor(private readonly trpc: TrpcService, private readonly agencyService: AgencyService) {}

  get router() {
    return this.trpc.router({
      applyAsAgency: this.trpc.protectedProcedure
        .input(z.object({
          name: z.string().min(2).max(100),
          contactName: z.string().min(2).max(100),
          contactEmail: z.string().email(),
          country: z.string().min(2).max(100),
        }))
        .mutation(async ({ ctx, input }) => this.agencyService.applyAsAgency(ctx.userId, input)),

      getAgencyDashboard: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.agencyService.getAgencyDashboard(ctx.userId)),

      inviteHost: this.trpc.protectedProcedure
        .input(z.object({ hostUserId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.agencyService.inviteHost(ctx.userId, input.hostUserId)),

      acceptInvite: this.trpc.protectedProcedure
        .input(z.object({ agencyId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.agencyService.acceptInvite(ctx.userId, input.agencyId)),

      getHostRoster: this.trpc.protectedProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ ctx, input }) => this.agencyService.getHostRoster(ctx.userId, input.cursor, input.limit)),

      removeHost: this.trpc.protectedProcedure
        .input(z.object({ hostUserId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.agencyService.removeHost(ctx.userId, input.hostUserId)),
    });
  }
}
