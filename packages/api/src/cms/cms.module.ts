import { Module } from "@nestjs/common";
import { CmsService } from "./cms.service";
import { CmsRouter } from "./cms.router";

@Module({
  providers: [CmsService, CmsRouter],
  exports: [CmsRouter, CmsService],
})
export class CmsModule {}
