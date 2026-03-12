import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { ChatService } from "./chat.service";
import {
  startChatSessionSchema,
  listConversationsSchema, getConversationMessagesSchema,
  sendDirectMessageSchema, archiveConversationSchema,
} from "@missu/types";

@Injectable()
export class ChatRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly chatService: ChatService,
  ) {}

  get router() {
    return this.trpc.router({
      startSession: this.trpc.protectedProcedure
        .input(startChatSessionSchema)
        .mutation(async ({ ctx, input }) => {
          return this.chatService.startSession(ctx.userId, input.modelUserId);
        }),

      getSessionBillingState: this.trpc.protectedProcedure
        .input(z.object({ sessionId: z.string().uuid() }))
        .query(async ({ input }) => {
          return this.chatService.getSessionBillingState(input.sessionId);
        }),

      listConversations: this.trpc.protectedProcedure
        .input(listConversationsSchema)
        .query(async ({ ctx, input }) => {
          return this.chatService.listConversations(ctx.userId, input.limit, input.cursor);
        }),

      getConversationMessages: this.trpc.protectedProcedure
        .input(getConversationMessagesSchema)
        .query(async ({ input }) => {
          return this.chatService.getConversationMessages(input.conversationId, input.limit, input.cursor);
        }),

      sendDirectMessage: this.trpc.protectedProcedure
        .input(sendDirectMessageSchema)
        .mutation(async ({ ctx, input }) => {
          return this.chatService.sendDirectMessage(
            ctx.userId, input.recipientUserId, input.content, input.type, input.mediaUrl,
          );
        }),

      archiveConversation: this.trpc.protectedProcedure
        .input(archiveConversationSchema)
        .mutation(async ({ input }) => {
          return this.chatService.archiveConversation(input.conversationId);
        }),
    });
  }
}
