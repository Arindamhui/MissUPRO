import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { NotificationService } from "./notification.service";

@Injectable()
export class NotificationRouter {
  constructor(private readonly trpc: TrpcService, private readonly notificationService: NotificationService) {}

  get router() {
    return this.trpc.router({
      getNotificationCenter: this.trpc.protectedProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ ctx, input }) =>
          this.notificationService.getNotificationCenter(ctx.userId, input.cursor, input.limit),
        ),

      markAsRead: this.trpc.protectedProcedure
        .input(z.object({ notificationId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) =>
          this.notificationService.markAsRead(input.notificationId, ctx.userId),
        ),

      markAllAsRead: this.trpc.protectedProcedure
        .mutation(async ({ ctx }) => this.notificationService.markAllAsRead(ctx.userId)),

      getPreferences: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.notificationService.getPreferences(ctx.userId)),

      updatePreference: this.trpc.protectedProcedure
        .input(z.object({
          category: z.string(),
          channel: z.string(),
          isEnabled: z.boolean(),
        }))
        .mutation(async ({ ctx, input }) =>
          this.notificationService.updatePreference(ctx.userId, input.category, input.channel, input.isEnabled),
        ),

      getCampaignBanners: this.trpc.protectedProcedure
        .query(async () => this.notificationService.getActiveCampaignBanners()),

      deleteNotification: this.trpc.protectedProcedure
        .input(z.object({ notificationId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) =>
          this.notificationService.deleteNotification(input.notificationId, ctx.userId),
        ),
    });
  }
}
