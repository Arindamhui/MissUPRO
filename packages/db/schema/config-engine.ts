import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  decimal,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { settingStatusEnum } from "./enums";

// Canonical config table aliases required by the plan.

export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleKey: text("rule_key").notNull(),
  category: text("category").notNull(),
  formulaJson: jsonb("formula_json").notNull(),
  constraintsJson: jsonb("constraints_json"),
  status: settingStatusEnum("status").default("DRAFT").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("pricing_rules_key_idx").on(t.ruleKey),
  index("pricing_rules_active_effective_idx").on(t.isActive, t.effectiveFrom, t.effectiveTo),
  index("pricing_rules_category_idx").on(t.category),
]);

export const giftCatalog = pgTable("gift_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  catalogKey: text("catalog_key").notNull(),
  displayName: text("display_name").notNull(),
  coinPrice: integer("coin_price").notNull(),
  diamondCredit: integer("diamond_credit").notNull(),
  effectTier: text("effect_tier").notNull(),
  animationConfigJson: jsonb("animation_config_json"),
  availabilityJson: jsonb("availability_json"),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("gift_catalog_key_idx").on(t.catalogKey),
  index("gift_catalog_active_order_idx").on(t.isActive, t.displayOrder),
]);

export const leaderboardConfigs = pgTable("leaderboard_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  configKey: text("config_key").notNull(),
  leaderboardType: text("leaderboard_type").notNull(),
  scoringMetric: text("scoring_metric").notNull(),
  refreshIntervalSeconds: integer("refresh_interval_seconds").notNull(),
  maxEntries: integer("max_entries").notNull(),
  rankingFormulaJson: jsonb("ranking_formula_json"),
  status: settingStatusEnum("status").default("DRAFT").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("leaderboard_configs_key_idx").on(t.configKey),
  index("leaderboard_configs_type_active_idx").on(t.leaderboardType, t.isActive),
]);

export const eventConfigs = pgTable("event_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  configKey: text("config_key").notNull(),
  eventType: text("event_type").notNull(),
  configJson: jsonb("config_json").notNull(),
  status: settingStatusEnum("status").default("DRAFT").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("event_configs_key_idx").on(t.configKey),
  index("event_configs_type_active_idx").on(t.eventType, t.isActive),
]);

export const vipTiers = pgTable("vip_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tierCode: text("tier_code").notNull(),
  displayName: text("display_name").notNull(),
  monthlyPriceUsd: decimal("monthly_price_usd", { precision: 10, scale: 2 }).notNull(),
  coinPrice: integer("coin_price"),
  perkJson: jsonb("perk_json").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("vip_tiers_code_idx").on(t.tierCode),
  index("vip_tiers_active_order_idx").on(t.isActive, t.displayOrder),
]);

export const referralRules = pgTable("referral_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleKey: text("rule_key").notNull(),
  qualificationJson: jsonb("qualification_json").notNull(),
  inviterRewardJson: jsonb("inviter_reward_json").notNull(),
  inviteeRewardJson: jsonb("invitee_reward_json"),
  antiFraudJson: jsonb("anti_fraud_json"),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("referral_rules_key_idx").on(t.ruleKey),
  index("referral_rules_active_effective_idx").on(t.isActive, t.effectiveFrom, t.effectiveTo),
]);

export const groupAudioConfigs = pgTable("group_audio_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  configKey: text("config_key").notNull(),
  configJson: jsonb("config_json").notNull(),
  status: settingStatusEnum("status").default("DRAFT").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("group_audio_configs_key_idx").on(t.configKey),
  index("group_audio_configs_active_effective_idx").on(t.isActive, t.effectiveFrom, t.effectiveTo),
]);

export const partyRoomConfigs = pgTable("party_room_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  configKey: text("config_key").notNull(),
  configJson: jsonb("config_json").notNull(),
  status: settingStatusEnum("status").default("DRAFT").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("party_room_configs_key_idx").on(t.configKey),
  index("party_room_configs_active_effective_idx").on(t.isActive, t.effectiveFrom, t.effectiveTo),
]);

export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  createdBy: one(users, { fields: [pricingRules.createdByAdminId], references: [users.id] }),
}));

export const giftCatalogRelations = relations(giftCatalog, ({ one }) => ({
  createdBy: one(users, { fields: [giftCatalog.createdByAdminId], references: [users.id] }),
}));

export const leaderboardConfigsRelations = relations(leaderboardConfigs, ({ one }) => ({
  createdBy: one(users, { fields: [leaderboardConfigs.createdByAdminId], references: [users.id] }),
}));

export const eventConfigsRelations = relations(eventConfigs, ({ one }) => ({
  createdBy: one(users, { fields: [eventConfigs.createdByAdminId], references: [users.id] }),
}));

export const vipTiersRelations = relations(vipTiers, ({ one }) => ({
  createdBy: one(users, { fields: [vipTiers.createdByAdminId], references: [users.id] }),
}));

export const referralRulesRelations = relations(referralRules, ({ one }) => ({
  createdBy: one(users, { fields: [referralRules.createdByAdminId], references: [users.id] }),
}));

export const groupAudioConfigsRelations = relations(groupAudioConfigs, ({ one }) => ({
  createdBy: one(users, { fields: [groupAudioConfigs.createdByAdminId], references: [users.id] }),
}));

export const partyRoomConfigsRelations = relations(partyRoomConfigs, ({ one }) => ({
  createdBy: one(users, { fields: [partyRoomConfigs.createdByAdminId], references: [users.id] }),
}));
