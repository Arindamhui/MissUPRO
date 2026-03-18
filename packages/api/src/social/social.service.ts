import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { dmConversations, dmMessages, followers, levels, profiles, userBlocks, userInboxPreferences, userLevels, users } from "@missu/db/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";

const DEFAULT_INBOX_PREFERENCES = {
  dmPrivacyRule: "ALL_USERS",
  allowLiveStreamLinks: true,
} as const;

const LIVE_STREAM_MESSAGE_TYPES = new Set(["LIVE_STREAM_LINK", "STREAM_LINK"]);
const URL_PATTERN = /(?:https?:\/\/|missupro:\/\/)[^\s]+/gi;
const LIVE_LINK_HINT_PATTERN = /(live|stream|room|pk|battle)/i;

@Injectable()
export class SocialService {
  private userSchemaModePromise: Promise<"modern" | "legacy"> | null = null;

  private messageContainsRestrictedLiveLink(content: string, messageType: string) {
    const normalizedMessageType = messageType.trim().toUpperCase();
    if (LIVE_STREAM_MESSAGE_TYPES.has(normalizedMessageType)) {
      return true;
    }

    const matches = content.match(URL_PATTERN) ?? [];
    return matches.some((match) => LIVE_LINK_HINT_PATTERN.test(match));
  }

  private async getUserSchemaMode() {
    if (!this.userSchemaModePromise) {
      this.userSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'users'
            and column_name = 'display_name'
        ) as has_display_name
      `).then((result) => {
        const value = result.rows[0] as { has_display_name?: boolean | string | number } | undefined;
        return value?.has_display_name ? "modern" : "legacy";
      });
    }

    return this.userSchemaModePromise;
  }

  private async getConversationUserSummary(userId: string) {
    if (await this.getUserSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          u.id,
          coalesce(p.display_name, u.username) as "displayName",
          u.username,
          p.avatar_url as "avatarUrl",
          p.bio,
          p.city,
          p.country
        from users u
        left join profiles p on p.user_id = u.id
        where u.id = ${userId}::uuid
        limit 1
      `);

      return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
    }

    const [otherUser] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: profiles.bio,
        locationDisplay: profiles.locationDisplay,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    return otherUser ?? null;
  }

  private async ensureMessagingAllowed(senderId: string, recipientId: string) {
    if (await this.getUserSchemaMode() === "legacy") {
      const blocked = await db.execute(sql`
        select id
        from user_blocks
        where (blocker_user_id = ${recipientId}::uuid and blocked_user_id = ${senderId}::uuid)
           or (blocker_user_id = ${senderId}::uuid and blocked_user_id = ${recipientId}::uuid)
        limit 1
      `);

      if (blocked.rows[0]) throw new Error("Cannot send message - user is blocked");
      return;
    }

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

    const [inboxPreferences] = await db
      .select()
      .from(userInboxPreferences)
      .where(eq(userInboxPreferences.userId, recipientId))
      .limit(1);

    const dmPrivacyRule = inboxPreferences?.dmPrivacyRule ?? DEFAULT_INBOX_PREFERENCES.dmPrivacyRule;

    if (dmPrivacyRule === "FOLLOWED_USERS") {
      const [isFollowed] = await db
        .select({ id: followers.id })
        .from(followers)
        .where(and(eq(followers.followerUserId, recipientId), eq(followers.followedUserId, senderId)))
        .limit(1);

      if (!isFollowed) {
        throw new Error("This user only accepts messages from followed accounts");
      }
    }

    if (dmPrivacyRule === "HIGHER_LEVEL_USERS") {
      const [senderLevel, recipientLevel] = await Promise.all([
        this.getUserLevelNumber(senderId),
        this.getUserLevelNumber(recipientId),
      ]);

      if (senderLevel <= recipientLevel) {
        throw new Error("This user only accepts messages from higher level users");
      }
    }
  }

  private async getUserLevelNumber(userId: string) {
    const [levelRecord] = await db
      .select({ levelNumber: levels.levelNumber })
      .from(userLevels)
      .innerJoin(levels, eq(levels.id, userLevels.currentLevelId))
      .where(and(eq(userLevels.userId, userId), eq(userLevels.levelTrack, "USER" as any)))
      .limit(1);

    return Number(levelRecord?.levelNumber ?? 0);
  }

  private async findConversationBetweenUsers(userId: string, otherUserId: string) {
    if (await this.getUserSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          id,
          participant_a_id as "userId1",
          participant_b_id as "userId2",
          status,
          last_message_at as "lastMessageAt",
          created_at as "createdAt",
          0::int as "unreadCountUser1",
          0::int as "unreadCountUser2"
        from dm_conversations
        where (participant_a_id = ${userId}::uuid and participant_b_id = ${otherUserId}::uuid)
           or (participant_a_id = ${otherUserId}::uuid and participant_b_id = ${userId}::uuid)
        limit 1
      `);

      return (result.rows[0] as Record<string, any> | undefined) ?? null;
    }

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
      if (await this.getUserSchemaMode() === "legacy") {
        const result = await db.execute(sql`
          insert into dm_conversations (
            id,
            participant_a_id,
            participant_b_id,
            status,
            last_message_at,
            created_at
          )
          values (
            gen_random_uuid(),
            ${orderedUsers[0]}::uuid,
            ${orderedUsers[1]}::uuid,
            'ACTIVE',
            now(),
            now()
          )
          returning
            id,
            participant_a_id as "userId1",
            participant_b_id as "userId2",
            status,
            last_message_at as "lastMessageAt",
            created_at as "createdAt",
            0::int as "unreadCountUser1",
            0::int as "unreadCountUser2"
        `);
        conversation = (result.rows[0] as Record<string, any> | undefined) ?? null;
      } else {
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
    }

    if (!conversation) throw new Error("Failed to create conversation");

    return {
      conversation,
      otherUserId,
    };
  }

  async listConversations(userId: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;

    if (await this.getUserSchemaMode() === "legacy") {
      const results = await db.execute(sql`
        select
          id,
          participant_a_id as "userId1",
          participant_b_id as "userId2",
          status,
          last_message_at as "lastMessageAt",
          created_at as "createdAt",
          0::int as "unreadCountUser1",
          0::int as "unreadCountUser2"
        from dm_conversations
        where participant_a_id = ${userId}::uuid or participant_b_id = ${userId}::uuid
        order by last_message_at desc nulls last, created_at desc
        limit ${limit + 1}
        offset ${offset}
      `);

      const rows = results.rows as Array<Record<string, any>>;
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      const enriched = await Promise.all(
        items.map(async (conv) => {
          const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;
          const otherUser = await this.getConversationUserSummary(otherUserId);
          const lastMessageResult = await db.execute(sql`
            select content as "contentText", created_at as "createdAt"
            from dm_messages
            where conversation_id = ${conv.id}::uuid
            order by created_at desc
            limit 1
          `);
          const lastMessage = lastMessageResult.rows[0] as { contentText?: string | null; createdAt?: Date | string | null } | undefined;

          return {
            ...conv,
            otherUser: otherUser
              ? {
                  userId: otherUser.id,
                  displayName: otherUser.displayName,
                  username: otherUser.username,
                  avatarUrl: otherUser.avatarUrl,
                  profileImage: otherUser.avatarUrl,
                }
              : null,
            unreadCount: 0,
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
        const otherUser = await this.getConversationUserSummary(otherUserId);
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
                userId: otherUser.id,
                displayName: otherUser.displayName,
                username: otherUser.username,
                avatarUrl: otherUser.avatarUrl,
                profileImage: otherUser.avatarUrl,
              }
            : null,
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
    if (await this.getUserSchemaMode() === "legacy") {
      const convResult = await db.execute(sql`
        select
          id,
          participant_a_id as "userId1",
          participant_b_id as "userId2",
          status,
          last_message_at as "lastMessageAt",
          created_at as "createdAt"
        from dm_conversations
        where id = ${conversationId}::uuid
          and (participant_a_id = ${userId}::uuid or participant_b_id = ${userId}::uuid)
        limit 1
      `);
      const conv = convResult.rows[0] as Record<string, any> | undefined;
      if (!conv) throw new Error("Conversation not found");

      const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;
      const otherUser = await this.getConversationUserSummary(otherUserId);
      const offset = cursor ? decodeCursor(cursor) : 0;
      const messageResult = await db.execute(sql`
        select
          id,
          conversation_id as "conversationId",
          sender_user_id as "senderUserId",
          content as "contentText",
          is_read as "isRead",
          created_at as "createdAt"
        from dm_messages
        where conversation_id = ${conversationId}::uuid
        order by created_at desc
        limit ${limit + 1}
        offset ${offset}
      `);

      const rows = messageResult.rows as Array<Record<string, any>>;
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

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

    // Verify user is part of conversation
    const [conv] = await db
      .select()
      .from(dmConversations)
      .where(and(eq(dmConversations.id, conversationId), or(eq(dmConversations.userId1, userId), eq(dmConversations.userId2, userId))))
      .limit(1);

    if (!conv) throw new Error("Conversation not found");

    const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;
    const otherUser = await this.getConversationUserSummary(otherUserId);

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

    const [inboxPreferences] = await db
      .select()
      .from(userInboxPreferences)
      .where(eq(userInboxPreferences.userId, recipientId))
      .limit(1);

    const allowLiveStreamLinks = inboxPreferences?.allowLiveStreamLinks ?? DEFAULT_INBOX_PREFERENCES.allowLiveStreamLinks;
    if (!allowLiveStreamLinks && this.messageContainsRestrictedLiveLink(content, messageType)) {
      throw new Error("This user does not accept live stream links");
    }

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

    if (await this.getUserSchemaMode() === "legacy") {
      const messageResult = await db.execute(sql`
        insert into dm_messages (
          id,
          conversation_id,
          sender_user_id,
          content,
          is_read,
          metadata,
          created_at
        )
        values (
          gen_random_uuid(),
          ${conversation.id}::uuid,
          ${senderId}::uuid,
          ${content},
          false,
          ${JSON.stringify({ messageType: messageType.toUpperCase() })}::jsonb,
          now()
        )
        returning
          id,
          conversation_id as "conversationId",
          sender_user_id as "senderUserId",
          content as "contentText",
          is_read as "isRead",
          created_at as "createdAt"
      `);

      await db.execute(sql`
        update dm_conversations
        set last_message_at = now(), status = 'ACTIVE'
        where id = ${conversation.id}::uuid
      `);

      return {
        conversation,
        message: messageResult.rows[0] ?? null,
      };
    }

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
    if (await this.getUserSchemaMode() === "legacy") {
      const convResult = await db.execute(sql`
        select id
        from dm_conversations
        where id = ${conversationId}::uuid
          and (participant_a_id = ${userId}::uuid or participant_b_id = ${userId}::uuid)
        limit 1
      `);

      if (!convResult.rows[0]) throw new Error("Conversation not found");

      await db.execute(sql`
        update dm_conversations
        set status = 'ARCHIVED'
        where id = ${conversationId}::uuid
      `);
      return { success: true };
    }

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
    if (await this.getUserSchemaMode() === "legacy") {
      const convResult = await db.execute(sql`
        select
          id,
          participant_a_id as "userId1",
          participant_b_id as "userId2"
        from dm_conversations
        where id = ${conversationId}::uuid
          and (participant_a_id = ${userId}::uuid or participant_b_id = ${userId}::uuid)
        limit 1
      `);
      const conv = convResult.rows[0] as Record<string, any> | undefined;
      if (!conv) throw new Error("Conversation not found");

      const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;
      await db.execute(sql`
        update dm_messages
        set is_read = true
        where conversation_id = ${conversationId}::uuid
          and sender_user_id = ${otherUserId}::uuid
          and coalesce(is_read, false) = false
      `);

      return {
        success: true,
        conversationId,
        otherUserId,
        readByUserId: userId,
        readAt: new Date().toISOString(),
      };
    }

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
