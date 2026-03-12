import { Module } from "@nestjs/common";
import { CallService } from "./call.service";
import { CallRouter } from "./call.router";

@Module({
  providers: [CallService, CallRouter],
  exports: [CallService, CallRouter],
})
export class CallsModule {}
