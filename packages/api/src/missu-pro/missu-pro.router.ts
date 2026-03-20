import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { MissuProService } from "./missu-pro.service";

const hostApplicationSchema = z.object({
  mode: z.enum(["PLATFORM", "AGENCY"]),
  agencyCode: z.string().trim().min(3).max(32).optional(),
  idProofUrls: z.array(z.string().url()).min(1).max(4),
  talentDetails: z.record(z.string(), z.unknown()),
  profileInfo: z.record(z.string(), z.unknown()),
}).superRefine((value, ctx) => {
  if (value.mode === "AGENCY" && !value.agencyCode) {
    ctx.addIssue({ code: "custom", path: ["agencyCode"], message: "Agency ID is required for agency-based host applications" });
  }
});

const agencyRegistrationSchema = z.object({
  agencyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(320),
  country: z.string().trim().min(2).max(80),
  website: z.string().trim().url().optional(),
  whatsappNumber: z.string().trim().min(7).max(24).optional(),
  notes: z.string().trim().max(1000).optional(),
});

@Injectable()
export class MissuProRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly missuProService: MissuProService,
  ) {}

  get router() {
    return this.trpc.router({
      getMyWorkspace: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.missuProService.getMyWorkspace(ctx.userId)),

      lookupAgencyByCode: this.trpc.protectedProcedure
        .input(z.object({ agencyCode: z.string().trim().min(3).max(32) }))
        .query(async ({ input }) => this.missuProService.lookupAgencyByCode(input.agencyCode)),

      submitHostApplication: this.trpc.protectedProcedure
        .input(hostApplicationSchema)
        .mutation(async ({ ctx, input }) => this.missuProService.submitHostApplication(ctx.userId, input)),

      registerAgency: this.trpc.protectedProcedure
        .input(agencyRegistrationSchema)
        .mutation(async ({ ctx, input }) => this.missuProService.registerAgency(ctx.userId, input)),

      getAgencyOverview: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.missuProService.getAgencyOverview(ctx.userId)),

      getAdminOverview: this.trpc.adminProcedure
        .query(async () => this.missuProService.getAdminOverview()),

      listHostApplications: this.trpc.adminProcedure
        .input(z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ input }) => this.missuProService.listHostApplications(input?.status, input?.limit ?? 20)),

      reviewHostApplication: this.trpc.adminProcedure
        .input(z.object({ applicationId: z.string().uuid(), action: z.enum(["approve", "reject"]), reason: z.string().max(500).optional() }))
        .mutation(async ({ ctx, input }) => this.missuProService.reviewHostApplication(ctx.userId, input)),

      listAgencies: this.trpc.adminProcedure
        .input(z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ input }) => this.missuProService.listAgencies(input?.status, input?.limit ?? 20)),

      reviewAgency: this.trpc.adminProcedure
        .input(z.object({ agencyId: z.string().uuid(), action: z.enum(["approve", "reject"]), reason: z.string().max(500).optional() }))
        .mutation(async ({ ctx, input }) => this.missuProService.reviewAgency(ctx.userId, input)),

      listHosts: this.trpc.adminProcedure
        .input(z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(), limit: z.number().int().min(1).max(100).default(25) }).optional())
        .query(async ({ input }) => this.missuProService.listHosts(input?.status, input?.limit ?? 25)),
    });
  }
}