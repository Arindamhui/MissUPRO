import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { MissuProRouter } from "./missu-pro.router";
import { MissuProService } from "./missu-pro.service";

@Module({
  imports: [NotificationsModule],
  providers: [MissuProService, MissuProRouter],
  exports: [MissuProService, MissuProRouter],
})
export class MissuProModule {}