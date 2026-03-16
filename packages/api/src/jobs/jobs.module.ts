import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { PaymentsModule } from "../payments/payments.module";
import { ReconciliationJobsService } from "./reconciliation-jobs.service";

@Module({
  imports: [
    WalletModule,
    PaymentsModule,
  ],
  providers: [ReconciliationJobsService],
})
export class JobsModule {}

