import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminRouter } from "./admin.router";

@Module({
  providers: [AdminService, AdminRouter],
  exports: [AdminRouter, AdminService],
})
export class AdminModule {}
