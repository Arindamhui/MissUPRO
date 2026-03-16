import { Module } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { PaymentRouter } from "./payment.router";
import { WalletModule } from "../wallet/wallet.module";

@Module({ imports: [WalletModule], providers: [PaymentService, PaymentRouter], exports: [PaymentService, PaymentRouter] })
export class PaymentsModule {}
