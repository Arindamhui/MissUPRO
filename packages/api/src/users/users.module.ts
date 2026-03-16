import { Module } from "@nestjs/common";
import { ModelsModule } from "../models/models.module";
import { UserService } from "./user.service";
import { UserRouter } from "./user.router";

@Module({
  imports: [ModelsModule],
  providers: [UserService, UserRouter],
  exports: [UserService, UserRouter],
})
export class UsersModule {}
