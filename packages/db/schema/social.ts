import {
  pgTable, uuid, text, integer, timestamp, boolean, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { dmConversationStatusEnum, dmMessageTypeEnum } from "./enums";
import { users } from "./users";

// ─── dm_conversations ───
export const dmConversations = pgTable("dm_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId1: uuid("user_id_1").notNull().references(() => users.id),
  userId2: uuid("user_id_2").notNull().references(() => users.id),
  status: dmConversationStatusEnum("status").default("ACTIVE").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  unreadCountUser1: integer("unread_count_user_1").default(0).notNull(),
  unreadCountUser2: integer("unread_count_user_2").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("dm_conversations_users_idx").on(t.userId1, t.userId2),
  index("dm_conversations_user2_user1_idx").on(t.userId2, t.userId1),
]);

// ─── dm_messages ───
export const dmMessages = pgTable("dm_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => dmConversations.id),
  senderUserId: uuid("sender_user_id").notNull().references(() => users.id),
  messageType: dmMessageTypeEnum("message_type").default("TEXT").notNull(),
  contentText: text("content_text"),
  mediaUrl: text("media_url"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("dm_messages_conversation_created_idx").on(t.conversationId, t.createdAt),
  index("dm_messages_sender_created_idx").on(t.senderUserId, t.createdAt),
]);

// ─── Relations ───
export const dmConversationsRelations = relations(dmConversations, ({ one, many }) => ({
  user1: one(users, { fields: [dmConversations.userId1], references: [users.id], relationName: "dmUser1" }),
  user2: one(users, { fields: [dmConversations.userId2], references: [users.id], relationName: "dmUser2" }),
  messages: many(dmMessages),
}));

export const dmMessagesRelations = relations(dmMessages, ({ one }) => ({
  conversation: one(dmConversations, { fields: [dmMessages.conversationId], references: [dmConversations.id] }),
  sender: one(users, { fields: [dmMessages.senderUserId], references: [users.id] }),
}));
