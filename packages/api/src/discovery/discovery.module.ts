import { Module } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service";
import { DiscoveryRouter } from "./discovery.router";

@Module({
  providers: [DiscoveryService, DiscoveryRouter],
  exports: [DiscoveryRouter, DiscoveryService],
})
export class DiscoveryModule {}
