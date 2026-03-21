import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { WalletService } from "./wallet.service";
import { requestWithdrawalSchema } from "@missu/types";

@Injectable()
export class WalletRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly walletService: WalletService,
  ) {}

  get router() {
    return this.trpc.router({
      getBalance: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.walletService.getBalance(ctx.userId);
        }),

      getCoinPackages: this.trpc.protectedProcedure
        .query(async () => {
          return this.walletService.getCoinPackages();
        }),

      getTopUpHistory: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.walletService.getTopUpHistory(ctx.userId);
        }),

      listTransactions: this.trpc.protectedProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(async ({ ctx, input }) => {
          return this.walletService.listTransactions(ctx.userId, input?.cursor, input?.limit ?? 20);
        }),

      topUp: this.trpc.adminProcedure
        .input(z.object({ userId: z.string().uuid(), amount: z.number().int().positive(), paymentReferenceId: z.string().uuid().optional(), description: z.string().max(300).optional() }))
        .mutation(async ({ input }) => {
          return this.walletService.topUpCoins(input.userId, input.amount, input.paymentReferenceId, input.description);
        }),

      spend: this.trpc.protectedProcedure
        .input(z.object({ amount: z.number().int().positive(), source: z.string().min(2).max(60), referenceId: z.string().uuid().optional(), description: z.string().max(300).optional() }))
        .mutation(async ({ ctx, input }) => {
          return this.walletService.spendCoins(ctx.userId, input.amount, input.source, input.referenceId, input.description);
        }),

      requestWithdrawal: this.trpc.protectedProcedure
        .input(requestWithdrawalSchema)
        .mutation(async ({ ctx, input }) => {
          return this.walletService.requestWithdrawal(
            ctx.userId, input.amountDiamonds, input.payoutMethod, input.payoutDetails,
          );
        }),

      runReconciliation: this.trpc.protectedProcedure
        .mutation(async ({ ctx }) => {
          return this.walletService.runReconciliation(ctx.userId);
        }),
    });
  }
}
