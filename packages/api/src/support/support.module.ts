import { Module } from "@nestjs/common";
import { SupportService } from "./support.service";
import { SupportRouter } from "./support.router";

@Module({
  providers: [SupportService, SupportRouter],
  exports: [SupportService, SupportRouter],
})
export class SupportModule {}
