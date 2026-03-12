import { Module } from "@nestjs/common";
import { FraudService } from "./fraud.service";
import { FraudRouter } from "./fraud.router";

@Module({
  providers: [FraudService, FraudRouter],
  exports: [FraudRouter, FraudService],
})
export class FraudModule {}
