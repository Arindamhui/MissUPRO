import { Module } from "@nestjs/common";
import { PayoutsService } from "./payouts.service";
import { PayoutsRouter } from "./payouts.router";

@Module({
  providers: [PayoutsService, PayoutsRouter],
  exports: [PayoutsService, PayoutsRouter],
})
export class PayoutsModule {}
