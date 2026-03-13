import { Module } from "@nestjs/common";
import { ComplianceService } from "./compliance.service";
import { ComplianceRouter } from "./compliance.router";

@Module({
  providers: [ComplianceService, ComplianceRouter],
  exports: [ComplianceService, ComplianceRouter],
})
export class ComplianceModule {}
