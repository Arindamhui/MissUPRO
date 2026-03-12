import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { ReferralService } from "./referral.service";

@Injectable()
export class ReferralRouter {
  constructor(private readonly trpc: TrpcService, private readonly referralService: ReferralService) {}

  get router() {
    return this.trpc.router({
      generateInviteCode: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.referralService.generateInviteCode(ctx.userId)),

      applyReferralCode: this.trpc.protectedProcedure
        .input(z.object({ inviteCode: z.string().min(4).max(20) }))
        .mutation(async ({ ctx, input }) => this.referralService.applyReferralCode(ctx.userId, input.inviteCode)),

      getReferralProgress: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.referralService.getReferralProgress(ctx.userId)),
    });
  }
}
