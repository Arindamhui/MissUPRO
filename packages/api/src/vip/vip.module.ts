import { Module } from "@nestjs/common";
import { VipService } from "./vip.service";
import { VipRouter } from "./vip.router";

@Module({
  providers: [VipService, VipRouter],
  exports: [VipRouter, VipService],
})
export class VipModule {}
