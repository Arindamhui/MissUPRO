import {
  pgTable, uuid, text, integer, timestamp, date, boolean, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { levelTrackEnum, levelStatusEnum } from "./enums";
import { users } from "./users";

// ─── levels ───
export const levels = pgTable("levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  levelNumber: integer("level_number").notNull(),
  levelName: text("level_name").notNull(),
  levelTrack: levelTrackEnum("level_track").notNull(),
  thresholdValue: integer("threshold_value").notNull(),
  iconUrl: text("icon_url"),
  status: levelStatusEnum("status").default("ACTIVE").notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("levels_track_number_idx").on(t.levelTrack, t.levelNumber),
  index("levels_track_status_threshold_idx").on(t.levelTrack, t.status, t.thresholdValue),
]);

// ─── user_levels ───
export const userLevels = pgTable("user_levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  levelTrack: levelTrackEnum("level_track").notNull(),
  currentLevelId: uuid("current_level_id").notNull().references(() => levels.id),
  currentProgressValue: integer("current_progress_value").default(0).notNull(),
  levelUpAt: timestamp("level_up_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("user_levels_user_track_idx").on(t.userId, t.levelTrack),
  index("user_levels_level_idx").on(t.currentLevelId),
]);

// ─── level_rewards ───
export const levelRewards = pgTable("level_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  levelId: uuid("level_id").notNull().references(() => levels.id),
  rewardType: text("reward_type").notNull(),
  rewardValue: text("reward_value").notNull(),
  rewardName: text("reward_name").notNull(),
  description: text("description").notNull(),
  autoGrant: boolean("auto_grant").default(false).notNull(),
  status: levelStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("level_rewards_level_status_idx").on(t.levelId, t.status),
]);

// ─── login_streaks ───
export const loginStreaks = pgTable("login_streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  currentStreakDays: integer("current_streak_days").default(0).notNull(),
  lastLoginDate: date("last_login_date").notNull(),
  lastDailyRewardAt: timestamp("last_daily_reward_at"),
  lastStreakRewardAt: timestamp("last_streak_reward_at"),
  regionCode: text("region_code").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("login_streaks_user_idx").on(t.userId),
]);

// ─── badges ───
export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  badgeKey: text("badge_key").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconUrl: text("icon_url").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("badges_key_idx").on(t.badgeKey),
]);

// ─── user_badges ───
export const userBadges = pgTable("user_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  badgeId: uuid("badge_id").notNull().references(() => badges.id),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
  source: text("source").notNull(),
  sourceReferenceId: uuid("source_reference_id"),
}, (t) => [
  uniqueIndex("user_badges_user_badge_idx").on(t.userId, t.badgeId),
  index("user_badges_user_idx").on(t.userId),
]);

// ─── Relations ───
export const levelsRelations = relations(levels, ({ many }) => ({
  userLevels: many(userLevels),
  rewards: many(levelRewards),
}));

export const userLevelsRelations = relations(userLevels, ({ one }) => ({
  user: one(users, { fields: [userLevels.userId], references: [users.id] }),
  level: one(levels, { fields: [userLevels.currentLevelId], references: [levels.id] }),
}));

export const levelRewardsRelations = relations(levelRewards, ({ one }) => ({
  level: one(levels, { fields: [levelRewards.levelId], references: [levels.id] }),
}));

export const loginStreaksRelations = relations(loginStreaks, ({ one }) => ({
  user: one(users, { fields: [loginStreaks.userId], references: [users.id] }),
}));
