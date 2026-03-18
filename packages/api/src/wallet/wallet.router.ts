import { Injectable } from "@nestjs/common";
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
