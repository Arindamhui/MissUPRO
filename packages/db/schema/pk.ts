import {
  pgTable, uuid, text, integer, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { pkStatusEnum, pkResultTypeEnum } from "./enums";
import { users } from "./users";
import { gifts } from "./gifts";

// ─── pk_sessions ───
export const pkSessions = pgTable("pk_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostAUserId: uuid("host_a_user_id").notNull().references(() => users.id),
  hostBUserId: uuid("host_b_user_id").notNull().references(() => users.id),
  status: pkStatusEnum("status").default("CREATED").notNull(),
  battleDurationSeconds: integer("battle_duration_seconds").notNull(),
  scoreMultiplierPercent: integer("score_multiplier_percent").default(100).notNull(),
  winnerRewardCoins: integer("winner_reward_coins").default(0).notNull(),
  loserRewardCoins: integer("loser_reward_coins").default(0).notNull(),
  drawRewardCoins: integer("draw_reward_coins").default(0).notNull(),
  hostAScore: integer("host_a_score").default(0).notNull(),
  hostBScore: integer("host_b_score").default(0).notNull(),
  winnerUserId: uuid("winner_user_id"),
  resultType: pkResultTypeEnum("result_type"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  rewardsGrantedAt: timestamp("rewards_granted_at"),
  createdByAdminId: uuid("created_by_admin_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("pk_sessions_status_started_idx").on(t.status, t.startedAt),
  index("pk_sessions_host_a_status_idx").on(t.hostAUserId, t.status),
  index("pk_sessions_host_b_status_idx").on(t.hostBUserId, t.status),
]);

// ─── pk_scores ───
export const pkScores = pgTable("pk_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  pkSessionId: uuid("pk_session_id").notNull().references(() => pkSessions.id),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  gifterUserId: uuid("gifter_user_id").notNull().references(() => users.id),
  giftId: uuid("gift_id").notNull().references(() => gifts.id),
  coinValue: integer("coin_value").notNull(),
  scoreValue: integer("score_value").default(0).notNull(),
  scoreMultiplierPercent: integer("score_multiplier_percent").default(100).notNull(),
  scoredAt: timestamp("scored_at").defaultNow().notNull(),
}, (t) => [
  index("pk_scores_session_host_idx").on(t.pkSessionId, t.hostUserId),
]);

// ─── Relations ───
export const pkSessionsRelations = relations(pkSessions, ({ one, many }) => ({
  hostA: one(users, { fields: [pkSessions.hostAUserId], references: [users.id], relationName: "pkHostA" }),
  hostB: one(users, { fields: [pkSessions.hostBUserId], references: [users.id], relationName: "pkHostB" }),
  scores: many(pkScores),
}));

export const pkScoresRelations = relations(pkScores, ({ one }) => ({
  pkSession: one(pkSessions, { fields: [pkScores.pkSessionId], references: [pkSessions.id] }),
  host: one(users, { fields: [pkScores.hostUserId], references: [users.id] }),
  gifter: one(users, { fields: [pkScores.gifterUserId], references: [users.id] }),
  gift: one(gifts, { fields: [pkScores.giftId], references: [gifts.id] }),
}));
