import { Module } from "@nestjs/common";
import { MissuProRouter } from "./missu-pro.router";
import { MissuProService } from "./missu-pro.service";

@Module({
  providers: [MissuProService, MissuProRouter],
  exports: [MissuProService, MissuProRouter],
})
export class MissuProModule {}