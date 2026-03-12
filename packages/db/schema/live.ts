import {
  pgTable, uuid, text, integer, timestamp, decimal, boolean, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  roomTypeEnum, roomStatusEnum, streamTypeEnum, streamStatusEnum,
  streamEndReasonEnum, chatMessageTypeEnum,
} from "./enums";
import { users } from "./users";

// ─── live_rooms ───
export const liveRooms = pgTable("live_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  roomName: text("room_name").notNull(),
  roomType: roomTypeEnum("room_type").default("PUBLIC").notNull(),
  category: text("category").notNull(),
  status: roomStatusEnum("status").default("IDLE").notNull(),
  totalSessions: integer("total_sessions").default(0).notNull(),
  totalWatchMinutes: integer("total_watch_minutes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("live_rooms_host_status_idx").on(t.hostUserId, t.status),
  index("live_rooms_status_category_idx").on(t.status, t.category),
]);

// ─── live_streams ───
export const liveStreams = pgTable("live_streams", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => liveRooms.id),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  streamTitle: text("stream_title"),
  streamType: streamTypeEnum("stream_type").default("SOLO").notNull(),
  status: streamStatusEnum("status").default("STARTING").notNull(),
  rtcChannelId: text("rtc_channel_id").notNull(),
  viewerCountPeak: integer("viewer_count_peak").default(0).notNull(),
  viewerCountCurrent: integer("viewer_count_current").default(0).notNull(),
  giftRevenueCoins: integer("gift_revenue_coins").default(0).notNull(),
  trendingScore: decimal("trending_score", { precision: 12, scale: 4 }).default("0").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  endReason: streamEndReasonEnum("end_reason"),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("live_streams_status_trending_idx").on(t.status, t.trendingScore),
  index("live_streams_host_status_started_idx").on(t.hostUserId, t.status, t.startedAt),
  index("live_streams_room_started_idx").on(t.roomId, t.startedAt),
]);

// ─── live_viewers ───
export const liveViewers = pgTable("live_viewers", {
  id: uuid("id").primaryKey().defaultRandom(),
  streamId: uuid("stream_id").notNull().references(() => liveStreams.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  watchDurationSeconds: integer("watch_duration_seconds").default(0).notNull(),
  giftCoinsSent: integer("gift_coins_sent").default(0).notNull(),
}, (t) => [
  index("live_viewers_stream_joined_idx").on(t.streamId, t.joinedAt),
  index("live_viewers_user_joined_idx").on(t.userId, t.joinedAt),
  index("live_viewers_stream_user_idx").on(t.streamId, t.userId),
]);

// ─── chat_messages (live stream chat) ───
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  streamId: uuid("stream_id").notNull().references(() => liveStreams.id),
  senderUserId: uuid("sender_user_id").notNull().references(() => users.id),
  messageType: chatMessageTypeEnum("message_type").default("TEXT").notNull(),
  contentText: text("content_text").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedByAdminId: uuid("deleted_by_admin_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("chat_messages_stream_created_idx").on(t.streamId, t.createdAt),
  index("chat_messages_sender_created_idx").on(t.senderUserId, t.createdAt),
]);

// ─── Relations ───
export const liveRoomsRelations = relations(liveRooms, ({ one, many }) => ({
  host: one(users, { fields: [liveRooms.hostUserId], references: [users.id] }),
  streams: many(liveStreams),
}));

export const liveStreamsRelations = relations(liveStreams, ({ one, many }) => ({
  room: one(liveRooms, { fields: [liveStreams.roomId], references: [liveRooms.id] }),
  host: one(users, { fields: [liveStreams.hostUserId], references: [users.id] }),
  viewers: many(liveViewers),
  chatMessages: many(chatMessages),
}));

export const liveViewersRelations = relations(liveViewers, ({ one }) => ({
  stream: one(liveStreams, { fields: [liveViewers.streamId], references: [liveStreams.id] }),
  user: one(users, { fields: [liveViewers.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  stream: one(liveStreams, { fields: [chatMessages.streamId], references: [liveStreams.id] }),
  sender: one(users, { fields: [chatMessages.senderUserId], references: [users.id] }),
}));
