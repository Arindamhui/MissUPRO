import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  chatSessions, chatBillingTicks,
  dmConversations, dmMessages,
} from "@missu/db/schema";
import { eq, and, desc, lt, or } from "drizzle-orm";

@Injectable()
export class ChatService {
  // ─── Live Chat Sessions ───
  async startSession(userId: string, modelUserId: string) {
    const [session] = await db.insert(chatSessions).values({
      userId,
      modelUserId,
      sessionType: "TEXT" as any,
      status: "ACTIVE" as any,
    }).returning();
    return session!;
  }

  async endSession(sessionId: string) {
    await db.update(chatSessions).set({
      status: "ENDED" as any,
      endedAt: new Date(),
    }).where(eq(chatSessions.id, sessionId));
    return { success: true };
  }

  async getSessionBillingState(sessionId: string) {
    const ticks = await db.select().from(chatBillingTicks)
      .where(eq(chatBillingTicks.chatSessionId, sessionId));
    return {
      totalTicks: ticks.length,
      totalCoinsDeducted: ticks.reduce((s, t) => s + t.coinsDeducted, 0),
    };
  }

  // ─── Direct Messages ───
  async listConversations(userId: string, limit: number, cursor?: string) {
    const conversations = await db.select().from(dmConversations)
      .where(
        and(
          or(
            eq(dmConversations.userId1, userId),
            eq(dmConversations.userId2, userId),
          ),
          eq(dmConversations.status, "ACTIVE" as any),
          cursor ? lt(dmConversations.lastMessageAt, new Date(cursor)) : undefined,
        ),
      )
      .orderBy(desc(dmConversations.lastMessageAt))
      .limit(limit + 1);

    const hasMore = conversations.length > limit;
    const items = hasMore ? conversations.slice(0, -1) : conversations;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.lastMessageAt?.toISOString() ?? null : null,
    };
  }

  async getConversationMessages(conversationId: string, limit: number, cursor?: string) {
    const messages = await db.select().from(dmMessages)
      .where(
        and(
          eq(dmMessages.conversationId, conversationId),
          cursor ? lt(dmMessages.createdAt, new Date(cursor)) : undefined,
        ),
      )
      .orderBy(desc(dmMessages.createdAt))
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.createdAt.toISOString() : null,
    };
  }

  async sendDirectMessage(
    senderId: string,
    recipientId: string,
    content: string,
    type: string,
    mediaUrl?: string,
  ) {
    let [conv] = await db.select().from(dmConversations)
      .where(
        or(
          and(eq(dmConversations.userId1, senderId), eq(dmConversations.userId2, recipientId)),
          and(eq(dmConversations.userId1, recipientId), eq(dmConversations.userId2, senderId)),
        ),
      ).limit(1);

    if (!conv) {
      [conv] = await db.insert(dmConversations).values({
        userId1: senderId,
        userId2: recipientId,
      }).returning();
    }

    const [msg] = await db.insert(dmMessages).values({
      conversationId: conv!.id,
      senderUserId: senderId,
      contentText: content,
      messageType: type as any,
      mediaUrl,
    }).returning();

    await db.update(dmConversations).set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(dmConversations.id, conv!.id));

    return msg!;
  }

  async archiveConversation(conversationId: string) {
    await db.update(dmConversations).set({
      status: "ARCHIVED" as any,
      updatedAt: new Date(),
    }).where(eq(dmConversations.id, conversationId));
    return { success: true };
  }
}
