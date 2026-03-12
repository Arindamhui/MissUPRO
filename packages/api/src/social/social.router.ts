import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { SocialService } from "./social.service";

@Injectable()
export class SocialRouter {
  constructor(private readonly trpc: TrpcService, private readonly socialService: SocialService) {}

  get router() {
    return this.trpc.router({
      listConversations: this.trpc.protectedProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ ctx, input }) => this.socialService.listConversations(ctx.userId, input.cursor, input.limit)),

      getMessages: this.trpc.protectedProcedure
        .input(z.object({ conversationId: z.string().uuid(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) }))
        .query(async ({ ctx, input }) => this.socialService.getMessages(input.conversationId, ctx.userId, input.cursor, input.limit)),

      sendMessage: this.trpc.protectedProcedure
        .input(z.object({ recipientId: z.string().uuid(), content: z.string().min(1).max(5000), messageType: z.string().default("text") }))
        .mutation(async ({ ctx, input }) => this.socialService.sendMessage(ctx.userId, input.recipientId, input.content, input.messageType)),

      archiveConversation: this.trpc.protectedProcedure
        .input(z.object({ conversationId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.socialService.archiveConversation(input.conversationId, ctx.userId)),

      markConversationRead: this.trpc.protectedProcedure
        .input(z.object({ conversationId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.socialService.markConversationRead(input.conversationId, ctx.userId)),
    });
  }
}
