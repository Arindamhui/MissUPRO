import { Module } from "@nestjs/common";
import { EventService } from "./event.service";
import { EventRouter } from "./event.router";

@Module({
  providers: [EventService, EventRouter],
  exports: [EventRouter, EventService],
})
export class EventsModule {}
