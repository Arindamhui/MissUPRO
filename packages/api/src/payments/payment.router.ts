import { Injectable } from "@nestjs/common";
import { TrpcService } from "../trpc/trpc.service";
import { PaymentService } from "./payment.service";
import { verifyWebhookEventSchema } from "@missu/types";

@Injectable()
export class PaymentRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly paymentService: PaymentService,
  ) {}

  get router() {
    return this.trpc.router({
      verifyAndStoreWebhookEvent: this.trpc.procedure
        .input(verifyWebhookEventSchema)
        .mutation(async ({ input }) => {
          return this.paymentService.verifyWebhookEvent(input.provider, input.payload, input.signature);
        }),
    });
  }
}
