import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { dmConversations, dmMessages, profiles, userBlocks } from "@missu/db/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";

@Injectable()
export class SocialService {
  async listConversations(userId: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;

    const results = await db
      .select()
      .from(dmConversations)
      .where(or(eq(dmConversations.userId1, userId), eq(dmConversations.userId2, userId)))
      .orderBy(desc(dmConversations.lastMessageAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    // Enrich with other user's profile
    const enriched = await Promise.all(
      items.map(async (conv) => {
        const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, otherUserId)).limit(1);
        return { ...conv, otherUser: profile ?? null };
      }),
    );

    return { items: enriched, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 50) {
    // Verify user is part of conversation
    const [conv] = await db
      .select()
      .from(dmConversations)
      .where(and(eq(dmConversations.id, conversationId), or(eq(dmConversations.userId1, userId), eq(dmConversations.userId2, userId))))
      .limit(1);

    if (!conv) throw new Error("Conversation not found");

    const offset = cursor ? decodeCursor(cursor) : 0;
    const messages = await db
      .select()
      .from(dmMessages)
      .where(eq(dmMessages.conversationId, conversationId))
      .orderBy(desc(dmMessages.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = messages.length > limit;
    return { items: hasMore ? messages.slice(0, limit) : messages, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async sendMessage(senderId: string, recipientId: string, content: string, messageType = "TEXT") {
    // Check if blocked
    const blocked = await db
      .select()
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerUserId, recipientId), eq(userBlocks.blockedUserId, senderId)),
          and(eq(userBlocks.blockerUserId, senderId), eq(userBlocks.blockedUserId, recipientId)),
        ),
      )
      .limit(1);

    if (blocked[0]) throw new Error("Cannot send message — user is blocked");

    // Find or create conversation
    let [conversation] = await db
      .select()
      .from(dmConversations)
      .where(
        or(
          and(eq(dmConversations.userId1, senderId), eq(dmConversations.userId2, recipientId)),
          and(eq(dmConversations.userId1, recipientId), eq(dmConversations.userId2, senderId)),
        ),
      )
      .limit(1);

    if (!conversation) {
      [conversation] = await db
        .insert(dmConversations)
        .values({ userId1: senderId, userId2: recipientId })
        .returning();
    }

    if (!conversation) throw new Error("Failed to create conversation");

    const [message] = await db
      .insert(dmMessages)
      .values({
        conversationId: conversation.id,
        senderUserId: senderId,
        contentText: content,
        messageType: messageType as any,
      })
      .returning();

    // Update conversation's last message timestamp
    await db.update(dmConversations).set({ lastMessageAt: new Date(), updatedAt: new Date() }).where(eq(dmConversations.id, conversation.id));

    return message;
  }

  async archiveConversation(conversationId: string, userId: string) {
    const [conv] = await db
      .select()
      .from(dmConversations)
      .where(and(eq(dmConversations.id, conversationId), or(eq(dmConversations.userId1, userId), eq(dmConversations.userId2, userId))))
      .limit(1);

    if (!conv) throw new Error("Conversation not found");

    await db.update(dmConversations).set({ status: "ARCHIVED" as any, updatedAt: new Date() }).where(eq(dmConversations.id, conversationId));
    return { success: true };
  }

  async markConversationRead(conversationId: string, userId: string) {
    // Mark all unread messages from other user as read
    const [conv] = await db
      .select()
      .from(dmConversations)
      .where(and(eq(dmConversations.id, conversationId), or(eq(dmConversations.userId1, userId), eq(dmConversations.userId2, userId))))
      .limit(1);

    if (!conv) throw new Error("Conversation not found");

    const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;
    await db
      .update(dmMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(dmMessages.conversationId, conversationId), eq(dmMessages.senderUserId, otherUserId), sql`${dmMessages.readAt} IS NULL`));

    return { success: true };
  }
}
