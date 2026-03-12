import { Module } from "@nestjs/common";
import { AgencyService } from "./agency.service";
import { AgencyRouter } from "./agency.router";

@Module({
  providers: [AgencyService, AgencyRouter],
  exports: [AgencyRouter, AgencyService],
})
export class AgenciesModule {}
