import { Module } from "@nestjs/common";
import { SecurityService } from "./security.service";
import { SecurityRouter } from "./security.router";

@Module({
  providers: [SecurityService, SecurityRouter],
  exports: [SecurityRouter, SecurityService],
})
export class SecurityModule {}
