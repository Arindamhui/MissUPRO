import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  groupAudioRoomTypeEnum, groupAudioRoomStatusEnum,
  groupAudioParticipantRoleEnum, groupAudioParticipantStatusEnum,
  handRaiseStatusEnum,
} from "./enums";
import { users } from "./users";

// ─── group_audio_rooms ───
export const groupAudioRooms = pgTable("group_audio_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  topicTagsJson: jsonb("topic_tags_json"),
  roomType: groupAudioRoomTypeEnum("room_type").default("FREE").notNull(),
  status: groupAudioRoomStatusEnum("status").default("CREATED").notNull(),
  maxSpeakers: integer("max_speakers").default(8).notNull(),
  maxListeners: integer("max_listeners").default(200).notNull(),
  coinsPerMinute: integer("coins_per_minute"),
  scheduledStartAt: timestamp("scheduled_start_at"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  totalDurationSeconds: integer("total_duration_seconds").default(0).notNull(),
  totalParticipantsCount: integer("total_participants_count").default(0).notNull(),
  peakListenerCount: integer("peak_listener_count").default(0).notNull(),
  isRecordingEnabled: boolean("is_recording_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("group_audio_rooms_status_started_idx").on(t.status, t.startedAt),
  index("group_audio_rooms_host_status_idx").on(t.hostUserId, t.status),
  index("group_audio_rooms_type_status_idx").on(t.roomType, t.status),
  index("group_audio_rooms_scheduled_idx").on(t.scheduledStartAt),
]);

// ─── group_audio_participants ───
export const groupAudioParticipants = pgTable("group_audio_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => groupAudioRooms.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: groupAudioParticipantRoleEnum("role").default("LISTENER").notNull(),
  status: groupAudioParticipantStatusEnum("status").default("ACTIVE").notNull(),
  isMuted: boolean("is_muted").default(false).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  totalDurationSeconds: integer("total_duration_seconds").default(0).notNull(),
  totalCoinsSpent: integer("total_coins_spent").default(0).notNull(),
  billableMinutes: integer("billable_minutes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("group_audio_participants_room_status_idx").on(t.roomId, t.status),
  index("group_audio_participants_user_status_idx").on(t.userId, t.status),
  index("group_audio_participants_room_role_idx").on(t.roomId, t.role),
]);

// ─── group_audio_billing_ticks ───
export const groupAudioBillingTicks = pgTable("group_audio_billing_ticks", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => groupAudioRooms.id),
  participantId: uuid("participant_id").notNull().references(() => groupAudioParticipants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  tickNumber: integer("tick_number").notNull(),
  coinsDeducted: integer("coins_deducted").notNull(),
  userBalanceAfter: integer("user_balance_after").notNull(),
  tickTimestamp: timestamp("tick_timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("group_audio_billing_room_participant_tick_idx").on(t.roomId, t.participantId, t.tickNumber),
  index("group_audio_billing_user_timestamp_idx").on(t.userId, t.tickTimestamp),
]);

// ─── group_audio_hand_raises ───
export const groupAudioHandRaises = pgTable("group_audio_hand_raises", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => groupAudioRooms.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: handRaiseStatusEnum("status").default("PENDING").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("group_audio_hand_raises_room_status_idx").on(t.roomId, t.status),
  index("group_audio_hand_raises_user_room_idx").on(t.userId, t.roomId),
]);

// ─── Relations ───
export const groupAudioRoomsRelations = relations(groupAudioRooms, ({ one, many }) => ({
  host: one(users, { fields: [groupAudioRooms.hostUserId], references: [users.id] }),
  participants: many(groupAudioParticipants),
  billingTicks: many(groupAudioBillingTicks),
  handRaises: many(groupAudioHandRaises),
}));

export const groupAudioParticipantsRelations = relations(groupAudioParticipants, ({ one }) => ({
  room: one(groupAudioRooms, { fields: [groupAudioParticipants.roomId], references: [groupAudioRooms.id] }),
  user: one(users, { fields: [groupAudioParticipants.userId], references: [users.id] }),
}));

export const groupAudioBillingTicksRelations = relations(groupAudioBillingTicks, ({ one }) => ({
  room: one(groupAudioRooms, { fields: [groupAudioBillingTicks.roomId], references: [groupAudioRooms.id] }),
  participant: one(groupAudioParticipants, { fields: [groupAudioBillingTicks.participantId], references: [groupAudioParticipants.id] }),
  user: one(users, { fields: [groupAudioBillingTicks.userId], references: [users.id] }),
}));

export const groupAudioHandRaisesRelations = relations(groupAudioHandRaises, ({ one }) => ({
  room: one(groupAudioRooms, { fields: [groupAudioHandRaises.roomId], references: [groupAudioRooms.id] }),
  user: one(users, { fields: [groupAudioHandRaises.userId], references: [users.id] }),
  resolver: one(users, { fields: [groupAudioHandRaises.resolvedByUserId], references: [users.id], relationName: "handRaiseResolver" }),
}));
