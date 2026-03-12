import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { gameTypeEnum, gameStatusEnum, gameResultTypeEnum } from "./enums";
import { users } from "./users";
import { callSessions } from "./calls";

// ─── games (registry) ───
export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameType: gameTypeEnum("game_type").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  defaultTimerSeconds: integer("default_timer_seconds").notNull(),
  maxDurationSeconds: integer("max_duration_seconds").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── game_sessions ───
export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  callSessionId: uuid("call_session_id").notNull().references(() => callSessions.id),
  gameType: gameTypeEnum("game_type").notNull(),
  status: gameStatusEnum("status").default("CREATED").notNull(),
  stateJson: jsonb("state_json"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  endReason: text("end_reason"),
}, (t) => [
  index("game_sessions_call_status_idx").on(t.callSessionId, t.status, t.startedAt),
]);

// ─── game_moves ───
export const gameMoves = pgTable("game_moves", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameSessionId: uuid("game_session_id").notNull().references(() => gameSessions.id),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id),
  moveSequence: integer("move_sequence").notNull(),
  movePayloadJson: jsonb("move_payload_json").notNull(),
  moveHash: text("move_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("game_moves_session_seq_idx").on(t.gameSessionId, t.moveSequence),
]);

// ─── game_players ───
export const gamePlayers = pgTable("game_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameSessionId: uuid("game_session_id").notNull().references(() => gameSessions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  roleOrSeat: text("role_or_seat").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
}, (t) => [
  uniqueIndex("game_players_session_user_idx").on(t.gameSessionId, t.userId),
]);

// ─── game_results ───
export const gameResults = pgTable("game_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameSessionId: uuid("game_session_id").notNull().references(() => gameSessions.id),
  winnerUserId: uuid("winner_user_id"),
  resultType: gameResultTypeEnum("result_type").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  rewardPayloadJson: jsonb("reward_payload_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("game_results_session_idx").on(t.gameSessionId),
]);

// ─── Relations ───
export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  callSession: one(callSessions, { fields: [gameSessions.callSessionId], references: [callSessions.id] }),
  moves: many(gameMoves),
  players: many(gamePlayers),
  result: one(gameResults),
}));

export const gameMovesRelations = relations(gameMoves, ({ one }) => ({
  gameSession: one(gameSessions, { fields: [gameMoves.gameSessionId], references: [gameSessions.id] }),
  actor: one(users, { fields: [gameMoves.actorUserId], references: [users.id] }),
}));

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  gameSession: one(gameSessions, { fields: [gamePlayers.gameSessionId], references: [gameSessions.id] }),
  user: one(users, { fields: [gamePlayers.userId], references: [users.id] }),
}));

export const gameResultsRelations = relations(gameResults, ({ one }) => ({
  gameSession: one(gameSessions, { fields: [gameResults.gameSessionId], references: [gameSessions.id] }),
}));
