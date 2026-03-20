import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthRouter } from "./auth.router";
import { AuthController } from "./auth.controller";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRouter],
  exports: [AuthService, AuthRouter],
})
export class AuthModule {}
