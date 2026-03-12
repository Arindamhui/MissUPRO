import { Module } from "@nestjs/common";
import { PartyService } from "./party.service";
import { PartyRouter } from "./party.router";

@Module({
  providers: [PartyService, PartyRouter],
  exports: [PartyRouter, PartyService],
})
export class PartyModule {}
