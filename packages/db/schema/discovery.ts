import {
  pgTable, uuid, text, integer, timestamp, decimal, boolean, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  candidateTypeEnum, recommendationSourceEnum, impressionSourceEnum,
} from "./enums";
import { users } from "./users";

// ─── recommendation_candidates ───
export const recommendationCandidates = pgTable("recommendation_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  candidateType: candidateTypeEnum("candidate_type").notNull(),
  candidateId: uuid("candidate_id").notNull(),
  score: decimal("score", { precision: 10, scale: 6 }).notNull(),
  scoringVersion: integer("scoring_version").notNull(),
  source: recommendationSourceEnum("source").notNull(),
  isServed: boolean("is_served").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (t) => [
  index("rec_candidates_user_type_score_idx").on(t.userId, t.candidateType, t.score),
  index("rec_candidates_expires_idx").on(t.expiresAt),
  index("rec_candidates_type_candidate_idx").on(t.candidateType, t.candidateId),
]);

// ─── recommendation_impressions ───
export const recommendationImpressions = pgTable("recommendation_impressions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  candidateType: candidateTypeEnum("candidate_type").notNull(),
  candidateId: uuid("candidate_id").notNull(),
  impressionSource: impressionSourceEnum("impression_source").notNull(),
  position: integer("position").notNull(),
  wasClicked: boolean("was_clicked").default(false).notNull(),
  clickedAt: timestamp("clicked_at"),
  watchDurationSeconds: integer("watch_duration_seconds"),
  scoringVersion: integer("scoring_version").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("rec_impressions_user_created_idx").on(t.userId, t.createdAt),
  index("rec_impressions_type_candidate_created_idx").on(t.candidateType, t.candidateId, t.createdAt),
  index("rec_impressions_version_clicked_idx").on(t.scoringVersion, t.wasClicked),
]);

// ─── recommendation_configs ───
export const recommendationConfigs = pgTable("recommendation_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  scopeType: text("scope_type").notNull(),
  scopeValue: text("scope_value").notNull(),
  weightsJson: text("weights_json").notNull(),
  trendingWindowMinutes: integer("trending_window_minutes").notNull(),
  featuredBoostMultiplier: decimal("featured_boost_multiplier", { precision: 5, scale: 2 }).notNull(),
  status: text("status").notNull(),
  version: integer("version").default(1).notNull(),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("rec_configs_scope_status_idx").on(t.scopeType, t.scopeValue, t.status),
]);

// ─── Relations ───
export const recommendationCandidatesRelations = relations(recommendationCandidates, ({ one }) => ({
  user: one(users, { fields: [recommendationCandidates.userId], references: [users.id] }),
}));

export const recommendationImpressionsRelations = relations(recommendationImpressions, ({ one }) => ({
  user: one(users, { fields: [recommendationImpressions.userId], references: [users.id] }),
}));
