import {
  pgTable, uuid, text, integer, timestamp, decimal, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  campaignRewardTypeEnum, campaignRewardStatusEnum,
  bannerLinkTypeEnum, bannerStatusEnum, iconStyleEnum, themeAssetTypeEnum,
  promotionTypeEnum, promotionStatusEnum, promotionAudienceEnum, promotionRewardTypeEnum,
} from "./enums";
import { users } from "./users";

// ─── campaigns ───
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignType: text("campaign_type").notNull(),
  name: text("name").notNull(),
  segmentRuleJson: jsonb("segment_rule_json"),
  rewardRuleJson: jsonb("reward_rule_json"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: text("status").default("DRAFT").notNull(),
  budgetLimitJson: jsonb("budget_limit_json"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("campaigns_status_start_end_idx").on(t.status, t.startAt, t.endAt),
]);

// ─── campaign_participants ───
export const campaignParticipants = pgTable("campaign_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  enrollmentStatus: text("enrollment_status").default("ENROLLED").notNull(),
  progressJson: jsonb("progress_json"),
  rewardStatus: text("reward_status"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("campaign_participants_campaign_user_idx").on(t.campaignId, t.userId),
]);

// ─── campaign_rewards ───
export const campaignRewards = pgTable("campaign_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  participantId: uuid("participant_id").notNull().references(() => campaignParticipants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  rewardType: campaignRewardTypeEnum("reward_type").notNull(),
  rewardValueJson: jsonb("reward_value_json").notNull(),
  ledgerTxnId: uuid("ledger_txn_id"),
  status: campaignRewardStatusEnum("status").default("PENDING").notNull(),
  grantedAt: timestamp("granted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("campaign_rewards_campaign_user_idx").on(t.campaignId, t.userId),
  index("campaign_rewards_user_status_idx").on(t.userId, t.status, t.createdAt),
  index("campaign_rewards_campaign_status_idx").on(t.campaignId, t.status),
]);

// ─── banners ───
export const banners = pgTable("banners", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  linkType: bannerLinkTypeEnum("link_type").notNull(),
  linkTarget: text("link_target").notNull(),
  position: integer("position").default(0).notNull(),
  status: bannerStatusEnum("status").default("INACTIVE").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("banners_status_position_idx").on(t.status, t.position),
  index("banners_start_end_idx").on(t.startDate, t.endDate),
]);

// ─── themes ───
export const themes = pgTable("themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color").notNull(),
  backgroundColor: text("background_color").notNull(),
  cardBackgroundColor: text("card_background_color").notNull(),
  textPrimaryColor: text("text_primary_color").notNull(),
  textSecondaryColor: text("text_secondary_color").notNull(),
  accentGradientStart: text("accent_gradient_start").notNull(),
  accentGradientEnd: text("accent_gradient_end").notNull(),
  backgroundImageUrl: text("background_image_url"),
  iconStyle: iconStyleEnum("icon_style").default("DEFAULT").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  scheduledStart: timestamp("scheduled_start"),
  scheduledEnd: timestamp("scheduled_end"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("themes_active_idx").on(t.isActive),
]);

// ─── theme_assets ───
export const themeAssets = pgTable("theme_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  themeId: uuid("theme_id").notNull().references(() => themes.id),
  assetType: themeAssetTypeEnum("asset_type").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("theme_assets_theme_idx").on(t.themeId),
]);

// ─── promotions ───
export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  promotionType: promotionTypeEnum("promotion_type").notNull(),
  status: promotionStatusEnum("status").default("DRAFT").notNull(),
  targetAudience: promotionAudienceEnum("target_audience").notNull(),
  targetRegion: text("target_region"),
  bannerImageUrl: text("banner_image_url"),
  maxBudget: decimal("max_budget", { precision: 12, scale: 2 }),
  budgetUsed: decimal("budget_used", { precision: 12, scale: 2 }).default("0"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rewardRulesJson: jsonb("reward_rules_json"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("promotions_status_start_end_idx").on(t.status, t.startDate, t.endDate),
]);

// ─── promotion_rewards ───
export const promotionRewards = pgTable("promotion_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  promotionId: uuid("promotion_id").notNull().references(() => promotions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  rewardType: promotionRewardTypeEnum("reward_type").notNull(),
  rewardValue: decimal("reward_value", { precision: 12, scale: 2 }).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("promotion_rewards_promo_user_idx").on(t.promotionId, t.userId),
]);

// ─── Relations ───
export const campaignsRelations = relations(campaigns, ({ many }) => ({
  participants: many(campaignParticipants),
  rewards: many(campaignRewards),
}));

export const campaignParticipantsRelations = relations(campaignParticipants, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignParticipants.campaignId], references: [campaigns.id] }),
  user: one(users, { fields: [campaignParticipants.userId], references: [users.id] }),
}));

export const campaignRewardsRelations = relations(campaignRewards, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignRewards.campaignId], references: [campaigns.id] }),
  participant: one(campaignParticipants, { fields: [campaignRewards.participantId], references: [campaignParticipants.id] }),
  user: one(users, { fields: [campaignRewards.userId], references: [users.id] }),
}));

export const themesRelations = relations(themes, ({ many }) => ({
  assets: many(themeAssets),
}));

export const themeAssetsRelations = relations(themeAssets, ({ one }) => ({
  theme: one(themes, { fields: [themeAssets.themeId], references: [themes.id] }),
}));

export const promotionsRelations = relations(promotions, ({ many }) => ({
  rewards: many(promotionRewards),
}));

export const promotionRewardsRelations = relations(promotionRewards, ({ one }) => ({
  promotion: one(promotions, { fields: [promotionRewards.promotionId], references: [promotions.id] }),
  user: one(users, { fields: [promotionRewards.userId], references: [users.id] }),
}));
