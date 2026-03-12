import {
  pgTable, uuid, text, integer, timestamp, decimal, date, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { admins } from "./admin";

// ─── events ───
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rulesJson: jsonb("rules_json"),
  rewardPoolJson: jsonb("reward_pool_json"),
  eligibilityCriteriaJson: jsonb("eligibility_criteria_json"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: text("status").default("DRAFT").notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("events_status_start_idx").on(t.status, t.startAt),
  index("events_type_status_idx").on(t.eventType, t.status),
]);

// ─── event_participants ───
export const eventParticipants = pgTable("event_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: text("status").default("ENROLLED").notNull(),
  progressJson: jsonb("progress_json"),
  score: decimal("score", { precision: 12, scale: 4 }).default("0"),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("event_participants_event_user_idx").on(t.eventId, t.userId),
  index("event_participants_event_score_idx").on(t.eventId, t.score),
]);

// ─── leaderboards ───
export const leaderboards = pgTable("leaderboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  leaderboardType: text("leaderboard_type").notNull(),
  title: text("title").notNull(),
  scoringMetric: text("scoring_metric").notNull(),
  windowType: text("window_type").notNull(),
  windowStart: timestamp("window_start"),
  windowEnd: timestamp("window_end"),
  maxEntries: integer("max_entries").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  refreshIntervalSeconds: integer("refresh_interval_seconds").notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("leaderboards_type_status_idx").on(t.leaderboardType, t.status),
  index("leaderboards_window_idx").on(t.windowType, t.windowStart, t.windowEnd),
]);

// ─── leaderboard_entries ───
export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  leaderboardId: uuid("leaderboard_id").notNull().references(() => leaderboards.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  rankPosition: integer("rank_position").notNull(),
  scoreValue: decimal("score_value", { precision: 14, scale: 4 }).notNull(),
  scoreDelta: decimal("score_delta", { precision: 14, scale: 4 }).default("0"),
  snapshotAt: timestamp("snapshot_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("leaderboard_entries_board_rank_idx").on(t.leaderboardId, t.rankPosition),
  uniqueIndex("leaderboard_entries_board_user_idx").on(t.leaderboardId, t.userId),
  index("leaderboard_entries_user_board_idx").on(t.userId, t.leaderboardId),
]);

// ─── leaderboard_snapshots ───
export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  leaderboardId: uuid("leaderboard_id").notNull().references(() => leaderboards.id),
  snapshotDate: date("snapshot_date").notNull(),
  entriesJson: jsonb("entries_json").notNull(),
  totalParticipants: integer("total_participants").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("leaderboard_snapshots_board_date_idx").on(t.leaderboardId, t.snapshotDate),
]);

// ─── host_analytics_snapshots ───
export const hostAnalyticsSnapshots = pgTable("host_analytics_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  snapshotDate: date("snapshot_date").notNull(),
  totalDiamondsEarned: integer("total_diamonds_earned").default(0).notNull(),
  totalStreams: integer("total_streams").default(0).notNull(),
  totalWatchMinutes: integer("total_watch_minutes").default(0).notNull(),
  uniqueViewers: integer("unique_viewers").default(0).notNull(),
  totalGiftsReceived: integer("total_gifts_received").default(0).notNull(),
  topGiftType: text("top_gift_type"),
  followerDelta: integer("follower_delta").default(0).notNull(),
}, (t) => [
  index("host_analytics_host_date_idx").on(t.hostUserId, t.snapshotDate),
]);

// ─── Relations ───
export const eventsRelations = relations(events, ({ many }) => ({
  participants: many(eventParticipants),
}));

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(events, { fields: [eventParticipants.eventId], references: [events.id] }),
  user: one(users, { fields: [eventParticipants.userId], references: [users.id] }),
}));

export const leaderboardsRelations = relations(leaderboards, ({ many }) => ({
  entries: many(leaderboardEntries),
  snapshots: many(leaderboardSnapshots),
}));

export const leaderboardEntriesRelations = relations(leaderboardEntries, ({ one }) => ({
  leaderboard: one(leaderboards, { fields: [leaderboardEntries.leaderboardId], references: [leaderboards.id] }),
  user: one(users, { fields: [leaderboardEntries.userId], references: [users.id] }),
}));
