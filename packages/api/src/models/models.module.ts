import { Module } from "@nestjs/common";
import { ModelService } from "./model.service";
import { ModelRouter } from "./model.router";

@Module({
  providers: [ModelService, ModelRouter],
  exports: [ModelService, ModelRouter],
})
export class ModelsModule {}
