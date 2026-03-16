import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { dmConversations, dmMessages, profiles, userBlocks, users } from "@missu/db/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";

@Injectable()
export class SocialService {
  private async ensureMessagingAllowed(senderId: string, recipientId: string) {
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
  }

  private async findConversationBetweenUsers(userId: string, otherUserId: string) {
    const [conversation] = await db
      .select()
      .from(dmConversations)
      .where(
        or(
          and(eq(dmConversations.userId1, userId), eq(dmConversations.userId2, otherUserId)),
          and(eq(dmConversations.userId1, otherUserId), eq(dmConversations.userId2, userId)),
        ),
      )
      .limit(1);

    return conversation ?? null;
  }

  async getOrCreateConversation(userId: string, otherUserId: string) {
    await this.ensureMessagingAllowed(userId, otherUserId);

    let conversation = await this.findConversationBetweenUsers(userId, otherUserId);
    if (!conversation) {
      const orderedUsers = [userId, otherUserId].sort();
      const [createdConversation] = await db
        .insert(dmConversations)
        .values({
          userId1: orderedUsers[0]!,
          userId2: orderedUsers[1]!,
          lastMessageAt: new Date(),
        })
        .returning();
      conversation = createdConversation ?? null;
    }

    if (!conversation) throw new Error("Failed to create conversation");

    return {
      conversation,
      otherUserId,
    };
  }

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
        const [otherUser] = await db
          .select({
            id: users.id,
            displayName: users.displayName,
            username: users.username,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(eq(users.id, otherUserId))
          .limit(1);
        const [lastMessage] = await db
          .select({ contentText: dmMessages.contentText, createdAt: dmMessages.createdAt })
          .from(dmMessages)
          .where(eq(dmMessages.conversationId, conv.id))
          .orderBy(desc(dmMessages.createdAt))
          .limit(1);

        return {
          ...conv,
          otherUser: otherUser
            ? {
                ...profile,
                userId: otherUser.id,
                displayName: otherUser.displayName,
                username: otherUser.username,
                avatarUrl: otherUser.avatarUrl,
                profileImage: otherUser.avatarUrl,
              }
            : profile ?? null,
          unreadCount: conv.userId1 === userId ? conv.unreadCountUser1 : conv.unreadCountUser2,
          lastMessage: lastMessage?.contentText ?? null,
          lastMessageAt: lastMessage?.createdAt ?? conv.lastMessageAt,
        };
      }),
    );

    return {
      items: enriched,
      conversations: enriched,
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 50) {
    // Verify user is part of conversation
    const [conv] = await db
      .select()
      .from(dmConversations)
      .where(and(eq(dmConversations.id, conversationId), or(eq(dmConversations.userId1, userId), eq(dmConversations.userId2, userId))))
      .limit(1);

    if (!conv) throw new Error("Conversation not found");

    const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;
    const [otherUser] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1);

    const offset = cursor ? decodeCursor(cursor) : 0;
    const messages = await db
      .select()
      .from(dmMessages)
      .where(eq(dmMessages.conversationId, conversationId))
      .orderBy(desc(dmMessages.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    return {
      items,
      messages: items,
      conversation: {
        id: conv.id,
        otherUserId,
        otherUser,
      },
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async sendMessage(senderId: string, recipientId: string, content: string, messageType = "TEXT") {
    await this.ensureMessagingAllowed(senderId, recipientId);

    // Find or create conversation
    let conversation = await this.findConversationBetweenUsers(senderId, recipientId);

    if (!conversation) {
      const orderedUsers = [senderId, recipientId].sort();
      const [createdConversation] = await db
        .insert(dmConversations)
        .values({ userId1: orderedUsers[0]!, userId2: orderedUsers[1]! })
        .returning();
      conversation = createdConversation ?? null;
    }

    if (!conversation) throw new Error("Failed to create conversation");

    const [message] = await db
      .insert(dmMessages)
      .values({
        conversationId: conversation.id,
        senderUserId: senderId,
        contentText: content,
        messageType: messageType.toUpperCase() as any,
      })
      .returning();

    // Update conversation's last message timestamp
    await db
      .update(dmConversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
        status: "ACTIVE" as any,
        unreadCountUser1: conversation.userId1 === recipientId
          ? sql`${dmConversations.unreadCountUser1} + 1`
          : conversation.userId1 === senderId
            ? sql`0`
            : dmConversations.unreadCountUser1,
        unreadCountUser2: conversation.userId2 === recipientId
          ? sql`${dmConversations.unreadCountUser2} + 1`
          : conversation.userId2 === senderId
            ? sql`0`
            : dmConversations.unreadCountUser2,
      })
      .where(eq(dmConversations.id, conversation.id));

    return {
      conversation,
      message,
    };
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

    await db
      .update(dmConversations)
      .set({
        updatedAt: new Date(),
        unreadCountUser1: conv.userId1 === userId ? 0 : conv.unreadCountUser1,
        unreadCountUser2: conv.userId2 === userId ? 0 : conv.unreadCountUser2,
      })
      .where(eq(dmConversations.id, conversationId));

    return {
      success: true,
      conversationId,
      otherUserId,
      readByUserId: userId,
      readAt: new Date().toISOString(),
    };
  }
}
