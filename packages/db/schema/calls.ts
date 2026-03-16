import {
  pgTable, uuid, text, integer, timestamp, boolean, index, uniqueIndex, jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  callTypeEnum, callStatusEnum, callEndReasonEnum,
  chatSessionTypeEnum, chatSessionStatusEnum,
} from "./enums";
import { users } from "./users";

// ─── calls ───
export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  callerUserId: uuid("caller_user_id").notNull().references(() => users.id),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  callType: callTypeEnum("call_type").notNull(),
  status: callStatusEnum("status").default("REQUESTED").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  cancelledAt: timestamp("cancelled_at"),
  failedAt: timestamp("failed_at"),
  failureReason: text("failure_reason"),
  callSessionId: uuid("call_session_id").references(() => callSessions.id),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("calls_caller_status_requested_idx").on(t.callerUserId, t.status, t.requestedAt),
  index("calls_model_status_requested_idx").on(t.modelUserId, t.status, t.requestedAt),
  uniqueIndex("calls_session_idx").on(t.callSessionId),
]);

// ─── call_sessions ───
export const callSessions = pgTable("call_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  callerUserId: uuid("caller_user_id").notNull().references(() => users.id),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  callType: callTypeEnum("call_type").notNull(),
  status: callStatusEnum("status").default("REQUESTED").notNull(),
  coinsPerMinuteSnapshot: integer("coins_per_minute_snapshot").notNull(),
  totalDurationSeconds: integer("total_duration_seconds").default(0).notNull(),
  billableMinutes: integer("billable_minutes").default(0).notNull(),
  totalCoinsSpent: integer("total_coins_spent").default(0).notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  endReason: callEndReasonEnum("end_reason"),
  minutesCreditedToModel: boolean("minutes_credited_to_model").default(false).notNull(),
  modelLevelSnapshot: integer("model_level_snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("call_sessions_caller_status_idx").on(t.callerUserId, t.status),
  index("call_sessions_model_status_idx").on(t.modelUserId, t.status),
  index("call_sessions_status_started_idx").on(t.status, t.startedAt),
]);

// ─── call_history ───
export const callHistory = pgTable("call_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id").notNull().references(() => calls.id),
  callSessionId: uuid("call_session_id").references(() => callSessions.id),
  callerUserId: uuid("caller_user_id").notNull().references(() => users.id),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  callType: callTypeEnum("call_type").notNull(),
  finalStatus: callStatusEnum("final_status").notNull(),
  totalDurationSeconds: integer("total_duration_seconds").default(0).notNull(),
  billableMinutes: integer("billable_minutes").default(0).notNull(),
  totalCoinsSpent: integer("total_coins_spent").default(0).notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  endReason: callEndReasonEnum("end_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("call_history_call_idx").on(t.callId),
  index("call_history_caller_ended_idx").on(t.callerUserId, t.endedAt),
  index("call_history_model_ended_idx").on(t.modelUserId, t.endedAt),
  index("call_history_status_ended_idx").on(t.finalStatus, t.endedAt),
]);

// ─── call_billing_ticks ───
export const callBillingTicks = pgTable("call_billing_ticks", {
  id: uuid("id").primaryKey().defaultRandom(),
  callSessionId: uuid("call_session_id").notNull().references(() => callSessions.id),
  tickNumber: integer("tick_number").notNull(),
  coinsDeducted: integer("coins_deducted").notNull(),
  userBalanceAfter: integer("user_balance_after").notNull(),
  tickTimestamp: timestamp("tick_timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("call_billing_ticks_session_tick_idx").on(t.callSessionId, t.tickNumber),
]);

// ─── chat_sessions (1:1 paid chat) ───
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  sessionType: chatSessionTypeEnum("session_type").notNull(),
  status: chatSessionStatusEnum("status").default("ACTIVE").notNull(),
  freeMinutesUsed: integer("free_minutes_used").default(0).notNull(),
  paidMinutesUsed: integer("paid_minutes_used").default(0).notNull(),
  totalCoinsSpent: integer("total_coins_spent").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("chat_sessions_user_model_status_idx").on(t.userId, t.modelUserId, t.status),
  index("chat_sessions_model_status_started_idx").on(t.modelUserId, t.status, t.startedAt),
]);

// ─── chat_billing_ticks ───
export const chatBillingTicks = pgTable("chat_billing_ticks", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatSessionId: uuid("chat_session_id").notNull().references(() => chatSessions.id),
  tickNumber: integer("tick_number").notNull(),
  coinsDeducted: integer("coins_deducted").notNull(),
  userBalanceAfter: integer("user_balance_after").notNull(),
  tickTimestamp: timestamp("tick_timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("chat_billing_ticks_session_tick_idx").on(t.chatSessionId, t.tickNumber),
]);

// ─── Relations ───
export const callsRelations = relations(calls, ({ one }) => ({
  caller: one(users, { fields: [calls.callerUserId], references: [users.id], relationName: "callRequestCaller" }),
  model: one(users, { fields: [calls.modelUserId], references: [users.id], relationName: "callRequestModel" }),
  session: one(callSessions, { fields: [calls.callSessionId], references: [callSessions.id] }),
}));

export const callSessionsRelations = relations(callSessions, ({ one, many }) => ({
  caller: one(users, { fields: [callSessions.callerUserId], references: [users.id], relationName: "caller" }),
  model: one(users, { fields: [callSessions.modelUserId], references: [users.id], relationName: "callModel" }),
  call: one(calls),
  billingTicks: many(callBillingTicks),
  historyEntries: many(callHistory),
}));

export const callHistoryRelations = relations(callHistory, ({ one }) => ({
  call: one(calls, { fields: [callHistory.callId], references: [calls.id] }),
  callSession: one(callSessions, { fields: [callHistory.callSessionId], references: [callSessions.id] }),
  caller: one(users, { fields: [callHistory.callerUserId], references: [users.id], relationName: "callHistoryCaller" }),
  model: one(users, { fields: [callHistory.modelUserId], references: [users.id], relationName: "callHistoryModel" }),
}));

export const callBillingTicksRelations = relations(callBillingTicks, ({ one }) => ({
  callSession: one(callSessions, { fields: [callBillingTicks.callSessionId], references: [callSessions.id] }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id], relationName: "chatUser" }),
  model: one(users, { fields: [chatSessions.modelUserId], references: [users.id], relationName: "chatModel" }),
  billingTicks: many(chatBillingTicks),
}));

export const chatBillingTicksRelations = relations(chatBillingTicks, ({ one }) => ({
  chatSession: one(chatSessions, { fields: [chatBillingTicks.chatSessionId], references: [chatSessions.id] }),
}));
