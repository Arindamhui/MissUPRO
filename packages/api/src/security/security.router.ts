import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { SecurityService } from "./security.service";
import { createIncidentSchema } from "@missu/types";

@Injectable()
export class SecurityRouter {
  constructor(private readonly trpc: TrpcService, private readonly securityService: SecurityService) {}

  get router() {
    return this.trpc.router({
      createIncident: this.trpc.adminProcedure
        .input(createIncidentSchema)
        .mutation(async ({ ctx, input }) =>
          this.securityService.createIncident({ incidentType: input.type, severity: input.severity, ownerAdminId: ctx.userId }),
        ),

      listIncidents: this.trpc.adminProcedure
        .input(z.object({ status: z.string().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input }) => this.securityService.listIncidents(input.status, input.cursor, input.limit)),

      updateIncident: this.trpc.adminProcedure
        .input(z.object({ incidentId: z.string().uuid(), status: z.string().optional(), postmortemUrl: z.string().optional() }))
        .mutation(async ({ input }) =>
          this.securityService.updateIncident(input.incidentId, { status: input.status, postmortemUrl: input.postmortemUrl }),
        ),

      getSecurityDashboard: this.trpc.adminProcedure
        .query(async () => this.securityService.getSecurityDashboard()),

      listSessions: this.trpc.adminProcedure
        .input(z.object({ userId: z.string().uuid().optional(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) }))
        .query(async ({ input }) => this.securityService.listSessions(input.userId, input.cursor, input.limit)),

      getSessionMonitoringSummary: this.trpc.adminProcedure
        .query(async () => this.securityService.getSessionMonitoringSummary()),

      revokeSessionByAdmin: this.trpc.adminProcedure
        .input(z.object({ sessionId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.securityService.revokeSessionByAdmin(input.sessionId, ctx.userId)),

      requireSessionStepUp: this.trpc.adminProcedure
        .input(z.object({ sessionId: z.string().uuid(), reason: z.string().min(3).max(500) }))
        .mutation(async ({ ctx, input }) =>
          this.securityService.requireSessionStepUp(input.sessionId, ctx.userId, input.reason),
        ),
    });
  }
}
