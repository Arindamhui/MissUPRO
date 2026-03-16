import { Global, Module } from "@nestjs/common";
import { IdempotencyService } from "./idempotency.service";
import { SocketEmitterService } from "./socket-emitter.service";
import { RealtimeStateService } from "../realtime/realtime-state.service";

@Global()
@Module({
  providers: [IdempotencyService, SocketEmitterService, RealtimeStateService],
  exports: [IdempotencyService, SocketEmitterService, RealtimeStateService],
})
export class CommonModule {}