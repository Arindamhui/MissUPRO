import { Module } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { PaymentRouter } from "./payment.router";

@Module({ providers: [PaymentService, PaymentRouter], exports: [PaymentService, PaymentRouter] })
export class PaymentsModule {}
