import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  settingStatusEnum, featureFlagTypeEnum, layoutPlatformEnum,
  homepageSectionTypeEnum,
} from "./enums";
import { users } from "./users";

// ─── system_settings ───
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  namespace: text("namespace").notNull(),
  key: text("key").notNull(),
  valueJson: jsonb("value_json").notNull(),
  environment: text("environment").notNull(),
  regionCode: text("region_code"),
  segmentCode: text("segment_code"),
  version: integer("version").default(1).notNull(),
  status: settingStatusEnum("status").default("DRAFT").notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  changeReason: text("change_reason").notNull(),
  updatedByAdminId: uuid("updated_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("system_settings_composite_idx").on(
    t.namespace, t.key, t.environment, t.regionCode, t.segmentCode, t.version,
  ),
  index("system_settings_lookup_idx").on(
    t.namespace, t.key, t.environment, t.regionCode, t.segmentCode, t.status, t.effectiveFrom,
  ),
  index("system_settings_version_idx").on(t.namespace, t.key, t.version),
  index("system_settings_admin_updated_idx").on(t.updatedByAdminId, t.updatedAt),
  index("system_settings_status_effective_idx").on(t.status, t.effectiveFrom, t.effectiveTo),
]);

// ─── feature_flags ───
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  flagKey: text("flag_key").notNull(),
  flagType: featureFlagTypeEnum("flag_type").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  percentageValue: integer("percentage_value"),
  userIdsJson: jsonb("user_ids_json"),
  regionCodesJson: jsonb("region_codes_json"),
  description: text("description").notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("feature_flags_key_idx").on(t.flagKey),
  index("feature_flags_enabled_idx").on(t.enabled),
]);

// ─── ui_layout_configs ───
export const uiLayoutConfigs = pgTable("ui_layout_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  layoutName: text("layout_name").notNull(),
  platform: layoutPlatformEnum("platform").notNull(),
  regionCode: text("region_code"),
  sectionsJson: jsonb("sections_json").notNull(),
  version: integer("version").default(1).notNull(),
  status: settingStatusEnum("status").default("DRAFT").notNull(),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  fallbackLayoutId: uuid("fallback_layout_id"),
  publishedByAdminId: uuid("published_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("ui_layout_configs_lookup_idx").on(t.layoutName, t.platform, t.regionCode, t.status, t.version),
  index("ui_layout_configs_status_effective_idx").on(t.status, t.effectiveFrom, t.effectiveTo),
]);

// ─── homepage_sections ───
export const homepageSections = pgTable("homepage_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionType: homepageSectionTypeEnum("section_type").notNull(),
  position: integer("position").default(0).notNull(),
  configJson: jsonb("config_json").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  scheduledStart: timestamp("scheduled_start"),
  scheduledEnd: timestamp("scheduled_end"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("homepage_sections_status_position_idx").on(t.status, t.position),
]);

// ─── Relations ───
export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedBy: one(users, { fields: [systemSettings.updatedByAdminId], references: [users.id] }),
}));

export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  createdBy: one(users, { fields: [featureFlags.createdByAdminId], references: [users.id] }),
}));
