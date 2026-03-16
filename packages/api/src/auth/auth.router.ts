import { Injectable } from "@nestjs/common";
import { TrpcService } from "../trpc/trpc.service";
import { AuthService } from "./auth.service";
import { sendVerificationEmailSchema, verifyEmailSchema, revokeSessionSchema } from "@missu/types";

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
    });
  }
}
