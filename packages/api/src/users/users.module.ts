import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserRouter } from "./user.router";

@Module({
  providers: [UserService, UserRouter],
  exports: [UserService, UserRouter],
})
export class UsersModule {}
