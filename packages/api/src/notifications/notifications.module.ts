import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationRouter } from "./notification.router";

@Module({
  providers: [NotificationService, NotificationRouter],
  exports: [NotificationRouter, NotificationService],
})
export class NotificationsModule {}
