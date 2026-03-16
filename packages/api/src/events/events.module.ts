import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { EventService } from "./event.service";
import { EventRouter } from "./event.router";

@Module({
  imports: [WalletModule],
  providers: [EventService, EventRouter],
  exports: [EventRouter, EventService],
})
export class EventsModule {}
