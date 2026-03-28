import { Global, Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { IdempotencyService } from "./idempotency.service";
import { SocketEmitterService } from "./socket-emitter.service";
import { RealtimeStateService } from "../realtime/realtime-state.service";
import { IdGenerationService } from "./id-generation.service";
import { IdValidationMiddleware } from "./id-validation.middleware";
import { RateLimiterService } from "./rate-limiter.service";
import { ApprovalService } from "./approval.service";

@Global()
@Module({
  providers: [
    IdempotencyService,
    SocketEmitterService,
    RealtimeStateService,
    IdGenerationService,
    RateLimiterService,
    ApprovalService,
  ],
  exports: [
    IdempotencyService,
    SocketEmitterService,
    RealtimeStateService,
    IdGenerationService,
    RateLimiterService,
    ApprovalService,
  ],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IdValidationMiddleware).forRoutes("*");
  }
}