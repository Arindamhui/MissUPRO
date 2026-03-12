import {
  pgTable, uuid, text, integer, timestamp, decimal, boolean, jsonb, date, time,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  modelApplicationStatusEnum, demoVideoStatusEnum, dayOfWeekEnum,
  levelChangeReasonEnum, formulaTypeEnum,
} from "./enums";
import { users } from "./users";

// ─── models ───
export const models = pgTable("models", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  talentCategoriesJson: jsonb("talent_categories_json").notNull(),
  talentDescription: text("talent_description").notNull(),
  languagesJson: jsonb("languages_json").notNull(),
  aboutText: text("about_text"),
  demoVideoCount: integer("demo_video_count").default(0).notNull(),
  callRateAudioCoins: integer("call_rate_audio_coins").notNull(),
  callRateVideoCoins: integer("call_rate_video_coins").notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  lastOnlineAt: timestamp("last_online_at"),
  totalFollowers: integer("total_followers").default(0).notNull(),
  totalStreams: integer("total_streams").default(0).notNull(),
  totalCallMinutes: integer("total_call_minutes").default(0).notNull(),
  responseRate: decimal("response_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }).default("0").notNull(),
  approvedAt: timestamp("approved_at"),
  approvedByAdminId: uuid("approved_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("models_user_id_idx").on(t.userId),
  index("models_online_quality_idx").on(t.isOnline, t.qualityScore),
]);

// ─── model_applications ───
export const modelApplications = pgTable("model_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  dob: date("dob").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  talentCategoriesJson: jsonb("talent_categories_json").notNull(),
  talentDescription: text("talent_description").notNull(),
  languagesJson: jsonb("languages_json").notNull(),
  scheduleJson: jsonb("schedule_json").notNull(),
  introVideoUrl: text("intro_video_url").notNull(),
  idDocFrontUrl: text("id_doc_front_url").notNull(),
  idDocBackUrl: text("id_doc_back_url").notNull(),
  status: modelApplicationStatusEnum("status").default("PENDING").notNull(),
  reviewedByAdminId: uuid("reviewed_by_admin_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
}, (t) => [
  index("model_applications_user_status_idx").on(t.userId, t.status),
  index("model_applications_status_submitted_idx").on(t.status, t.submittedAt),
]);

// ─── model_demo_videos ───
export const modelDemoVideos = pgTable("model_demo_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  title: text("title"),
  durationSeconds: integer("duration_seconds").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  status: demoVideoStatusEnum("status").default("PENDING_REVIEW").notNull(),
  reviewedByAdminId: uuid("reviewed_by_admin_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("model_demo_videos_model_status_order_idx").on(t.modelUserId, t.status, t.displayOrder),
  index("model_demo_videos_status_created_idx").on(t.status, t.createdAt),
]);

// ─── model_call_stats ───
export const modelCallStats = pgTable("model_call_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  audioMinutesTotal: integer("audio_minutes_total").default(0).notNull(),
  videoMinutesTotal: integer("video_minutes_total").default(0).notNull(),
  audioMinutesPending: integer("audio_minutes_pending").default(0).notNull(),
  videoMinutesPending: integer("video_minutes_pending").default(0).notNull(),
  audioMinutesPaid: integer("audio_minutes_paid").default(0).notNull(),
  videoMinutesPaid: integer("video_minutes_paid").default(0).notNull(),
  groupAudioMinutesTotal: integer("group_audio_minutes_total").default(0).notNull(),
  groupAudioMinutesPending: integer("group_audio_minutes_pending").default(0).notNull(),
  groupAudioMinutesPaid: integer("group_audio_minutes_paid").default(0).notNull(),
  lastCallAt: timestamp("last_call_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("model_call_stats_model_idx").on(t.modelUserId),
]);

// ─── model_availability ───
export const modelAvailability = pgTable("model_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  timezone: text("timezone").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("model_availability_model_day_idx").on(t.modelUserId, t.dayOfWeek, t.isActive),
]);

// ─── model_reviews ───
export const modelReviews = pgTable("model_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewerUserId: uuid("reviewer_user_id").notNull().references(() => users.id),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  callSessionId: uuid("call_session_id").notNull(),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  isVisible: boolean("is_visible").default(true).notNull(),
  reported: boolean("reported").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("model_reviews_model_created_idx").on(t.modelUserId, t.createdAt),
  uniqueIndex("model_reviews_call_session_idx").on(t.callSessionId),
  index("model_reviews_reviewer_created_idx").on(t.reviewerUserId, t.createdAt),
  index("model_reviews_rating_model_idx").on(t.rating, t.modelUserId),
]);

// ─── model_level_rules ───
export const modelLevelRules = pgTable("model_level_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  levelNumber: integer("level_number").notNull(),
  levelName: text("level_name").notNull(),
  diamondsRequired: integer("diamonds_required").default(0).notNull(),
  videoMinutesRequired: integer("video_minutes_required").default(0).notNull(),
  audioMinutesRequired: integer("audio_minutes_required").default(0).notNull(),
  videoCallPrice: integer("video_call_price").notNull(),
  audioCallPrice: integer("audio_call_price").notNull(),
  badgeIconUrl: text("badge_icon_url"),
  badgeColorHex: text("badge_color_hex"),
  priorityBoost: integer("priority_boost").default(0).notNull(),
  homepageEligible: boolean("homepage_eligible").default(false).notNull(),
  prioritySupport: boolean("priority_support").default(false).notNull(),
  revenueShareBonusPct: decimal("revenue_share_bonus_pct", { precision: 5, scale: 2 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("model_level_rules_level_idx").on(t.levelNumber),
  index("model_level_rules_active_level_idx").on(t.isActive, t.levelNumber),
]);

// ─── model_stats ───
export const modelStats = pgTable("model_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  currentLevel: integer("current_level").default(1).notNull(),
  totalDiamonds: integer("total_diamonds").default(0).notNull(),
  totalVideoMinutes: integer("total_video_minutes").default(0).notNull(),
  totalAudioMinutes: integer("total_audio_minutes").default(0).notNull(),
  totalCallsCompleted: integer("total_calls_completed").default(0).notNull(),
  totalGiftsReceived: integer("total_gifts_received").default(0).notNull(),
  levelUpdatedAt: timestamp("level_updated_at"),
  levelOverride: integer("level_override"),
  levelOverrideReason: text("level_override_reason"),
  levelOverrideByAdminId: uuid("level_override_by_admin_id"),
  priceOverrideVideo: integer("price_override_video"),
  priceOverrideAudio: integer("price_override_audio"),
  priceOverrideReason: text("price_override_reason"),
  priceOverrideByAdminId: uuid("price_override_by_admin_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("model_stats_model_idx").on(t.modelUserId),
  index("model_stats_level_idx").on(t.currentLevel),
  index("model_stats_diamonds_idx").on(t.totalDiamonds),
  index("model_stats_level_updated_idx").on(t.levelUpdatedAt),
]);

// ─── model_level_history (immutable) ───
export const modelLevelHistory = pgTable("model_level_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  oldLevel: integer("old_level").notNull(),
  newLevel: integer("new_level").notNull(),
  changeReason: levelChangeReasonEnum("change_reason").notNull(),
  changedByAdminId: uuid("changed_by_admin_id"),
  statsSnapshotJson: jsonb("stats_snapshot_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("model_level_history_model_created_idx").on(t.modelUserId, t.createdAt),
  index("model_level_history_reason_created_idx").on(t.changeReason, t.createdAt),
  index("model_level_history_new_level_created_idx").on(t.newLevel, t.createdAt),
]);

// ─── call_pricing_rules ───
export const callPricingRules = pgTable("call_pricing_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleName: text("rule_name").notNull(),
  formulaType: formulaTypeEnum("formula_type").notNull(),
  baseVideoPrice: integer("base_video_price").notNull(),
  baseAudioPrice: integer("base_audio_price").notNull(),
  levelMultiplier: decimal("level_multiplier", { precision: 5, scale: 2 }),
  levelIncrementVideo: integer("level_increment_video"),
  levelIncrementAudio: integer("level_increment_audio"),
  priceCapVideo: integer("price_cap_video").notNull(),
  priceCapAudio: integer("price_cap_audio").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("call_pricing_rules_active_effective_idx").on(t.isActive, t.effectiveFrom, t.effectiveTo),
  index("call_pricing_rules_formula_idx").on(t.formulaType),
]);

// ─── Relations ───
export const modelsRelations = relations(models, ({ one, many }) => ({
  user: one(users, { fields: [models.userId], references: [users.id] }),
  demoVideos: many(modelDemoVideos),
  reviews: many(modelReviews),
  availability: many(modelAvailability),
}));

export const modelApplicationsRelations = relations(modelApplications, ({ one }) => ({
  user: one(users, { fields: [modelApplications.userId], references: [users.id] }),
  reviewer: one(users, { fields: [modelApplications.reviewedByAdminId], references: [users.id], relationName: "appReviewer" }),
}));

export const modelStatsRelations = relations(modelStats, ({ one }) => ({
  model: one(users, { fields: [modelStats.modelUserId], references: [users.id] }),
}));

export const modelLevelHistoryRelations = relations(modelLevelHistory, ({ one }) => ({
  model: one(users, { fields: [modelLevelHistory.modelUserId], references: [users.id] }),
}));
