import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { FraudService } from "./fraud.service";

@Injectable()
export class FraudRouter {
  constructor(private readonly trpc: TrpcService, private readonly fraudService: FraudService) {}

  get router() {
    return this.trpc.router({
      scoreTransactionRisk: this.trpc.protectedProcedure
        .input(z.object({
          amount: z.number().positive(),
          transactionType: z.string(),
        }))
        .mutation(async ({ ctx, input }) =>
          this.fraudService.scoreTransactionRisk(ctx.userId, input.amount, input.transactionType),
        ),

      getFraudDashboard: this.trpc.adminProcedure
        .query(async () => this.fraudService.getFraudDashboard()),
    });
  }
}
