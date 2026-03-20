import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { AuthService } from "./auth.service";
import { sendVerificationEmailSchema, verifyEmailSchema, revokeSessionSchema } from "@missu/types";
import { agencyModelLoginSchema, completeAgencySignupSchema, completeMobileOnboardingSchema, mobilePanelSchema } from "./auth.schemas";

@Injectable()
export class AuthRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly authService: AuthService,
  ) {}

  get router() {
    return this.trpc.router({
      sendVerificationEmail: this.trpc.protectedProcedure
        .input(sendVerificationEmailSchema)
        .mutation(async ({ ctx, input }) => {
          return this.authService.sendVerificationEmail(ctx.userId, input.email, input.type);
        }),

      verifyEmail: this.trpc.procedure
        .input(verifyEmailSchema)
        .mutation(async ({ input }) => {
          const result = await this.authService.verifyEmail(input.token);
          if (!result) throw new Error("Invalid or expired verification");
          return { success: true };
        }),

      resendVerification: this.trpc.protectedProcedure
        .input(sendVerificationEmailSchema)
        .mutation(async ({ ctx, input }) => {
          return this.authService.sendVerificationEmail(ctx.userId, input.email, input.type);
        }),

      revokeSession: this.trpc.protectedProcedure
        .input(revokeSessionSchema)
        .mutation(async ({ ctx, input }) => {
          await this.authService.revokeSession(input.sessionId, ctx.userId);
          return { success: true };
        }),

      listMySessions: this.trpc.protectedProcedure.query(async ({ ctx }) => {
        return this.authService.listMySessions(ctx.userId);
      }),

      completeAgencySignup: this.trpc.protectedProcedure
        .input(completeAgencySignupSchema)
        .mutation(async ({ ctx, input }) => {
          return this.authService.completeAgencySignupForUser(ctx.userId, input);
        }),

      /** Mobile session — resolves which panel (user / model / agency_model) the caller belongs to. */
      getMobileSession: this.trpc.protectedProcedure
        .input(z.object({ panel: mobilePanelSchema }).optional())
        .query(async ({ ctx, input }) => {
          const panel = input?.panel ?? "user";
          return this.authService.getMobileSessionForUser(ctx.userId, panel);
        }),

      completeMobileOnboarding: this.trpc.protectedProcedure
        .input(completeMobileOnboardingSchema)
        .mutation(async ({ ctx, input }) => {
          return this.authService.completeMobileOnboardingForUser(ctx.userId, input);
        }),

      /** Agency-model login (model logs in through their agency's ID). */
      loginAsAgencyModel: this.trpc.protectedProcedure
        .input(agencyModelLoginSchema)
        .mutation(async ({ ctx, input }) => {
          return this.authService.loginAsAgencyModelForUser(ctx.userId, input);
        }),

      /** Admin: list agencies waiting for approval. */
      listPendingAgencies: this.trpc.adminProcedure
        .query(async () => {
          return this.authService.listPendingAgencies();
        }),

      /** Admin: approve a pending agency. */
      approveAgency: this.trpc.adminProcedure
        .input(z.object({ agencyId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.authService.approveAgency(input.agencyId, ctx.userId);
        }),

      /** Admin: reject a pending agency. */
      rejectAgency: this.trpc.adminProcedure
        .input(z.object({ agencyId: z.string().uuid(), reason: z.string().max(500).optional() }))
        .mutation(async ({ ctx, input }) => {
          return this.authService.rejectAgency(input.agencyId, ctx.userId, input.reason);
        }),
    });
  }
}
