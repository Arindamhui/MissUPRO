import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  settingStatusEnum, featureFlagTypeEnum, featureFlagPlatformEnum, layoutPlatformEnum,
  homepageSectionTypeEnum, uiComponentTypeEnum, uiComponentStatusEnum,
  economySettingTypeEnum,
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
  featureName: text("feature_name").notNull(),
  flagType: featureFlagTypeEnum("flag_type").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  platform: featureFlagPlatformEnum("platform").default("ALL").notNull(),
  appVersion: text("app_version"),
  percentageValue: integer("percentage_value"),
  userIdsJson: jsonb("user_ids_json"),
  regionCodesJson: jsonb("region_codes_json"),
  description: text("description").notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("feature_flags_scope_idx").on(t.flagKey, t.platform, t.appVersion),
  index("feature_flags_feature_platform_idx").on(t.featureName, t.platform, t.appVersion),
  index("feature_flags_enabled_idx").on(t.enabled, t.platform),
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

// ─── ui_layouts ───
export const uiLayouts = pgTable("ui_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  layoutKey: text("layout_key").notNull(),
  layoutName: text("layout_name").notNull(),
  screenKey: text("screen_key").notNull(),
  platform: layoutPlatformEnum("platform").notNull(),
  environment: text("environment").default("development").notNull(),
  regionCode: text("region_code"),
  version: integer("version").default(1).notNull(),
  status: settingStatusEnum("status").default("DRAFT").notNull(),
  tabNavigationJson: jsonb("tab_navigation_json"),
  metadataJson: jsonb("metadata_json"),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  publishedByAdminId: uuid("published_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("ui_layouts_scope_version_idx").on(t.layoutKey, t.platform, t.environment, t.regionCode, t.version),
  index("ui_layouts_lookup_idx").on(t.layoutKey, t.screenKey, t.platform, t.environment, t.regionCode, t.status, t.effectiveFrom),
]);

// ─── ui_components ───
export const uiComponents = pgTable("ui_components", {
  id: uuid("id").primaryKey().defaultRandom(),
  componentKey: text("component_key").notNull(),
  componentType: uiComponentTypeEnum("component_type").notNull(),
  displayName: text("display_name").notNull(),
  schemaVersion: integer("schema_version").default(1).notNull(),
  propsJson: jsonb("props_json").notNull(),
  dataSourceKey: text("data_source_key"),
  status: uiComponentStatusEnum("status").default("DRAFT").notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  publishedByAdminId: uuid("published_by_admin_id").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("ui_components_key_version_idx").on(t.componentKey, t.schemaVersion),
  index("ui_components_status_type_idx").on(t.status, t.componentType),
]);

// ─── component_positions ───
export const componentPositions = pgTable("component_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  layoutId: uuid("layout_id").notNull().references(() => uiLayouts.id),
  componentId: uuid("component_id").notNull().references(() => uiComponents.id),
  sectionKey: text("section_key").notNull(),
  slotKey: text("slot_key"),
  breakpoint: text("breakpoint").default("default").notNull(),
  positionIndex: integer("position_index").default(0).notNull(),
  visibilityRulesJson: jsonb("visibility_rules_json"),
  overridesJson: jsonb("overrides_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("component_positions_layout_component_breakpoint_idx").on(t.layoutId, t.componentId, t.breakpoint),
  index("component_positions_layout_section_position_idx").on(t.layoutId, t.sectionKey, t.positionIndex),
]);

// ─── economy_settings ───
export const economySettings = pgTable("economy_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  settingType: economySettingTypeEnum("setting_type").notNull(),
  profileKey: text("profile_key").notNull(),
  key: text("key").notNull(),
  valueJson: jsonb("value_json").notNull(),
  environment: text("environment").notNull(),
  regionCode: text("region_code"),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  version: integer("version").default(1).notNull(),
  status: settingStatusEnum("status").default("DRAFT").notNull(),
  changedByAdminId: uuid("changed_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("economy_settings_scope_version_idx").on(t.settingType, t.profileKey, t.key, t.environment, t.regionCode, t.version),
  index("economy_settings_lookup_idx").on(t.settingType, t.profileKey, t.key, t.environment, t.status, t.effectiveFrom),
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

export const uiLayoutsRelations = relations(uiLayouts, ({ one, many }) => ({
  publishedBy: one(users, { fields: [uiLayouts.publishedByAdminId], references: [users.id] }),
  positions: many(componentPositions),
}));

export const uiLayoutConfigsRelations = relations(uiLayoutConfigs, ({ one, many }) => ({
  publishedBy: one(users, { fields: [uiLayoutConfigs.publishedByAdminId], references: [users.id] }),
  positions: many(componentPositions),
}));

export const uiComponentsRelations = relations(uiComponents, ({ one, many }) => ({
  createdBy: one(users, { fields: [uiComponents.createdByAdminId], references: [users.id], relationName: "uiComponentCreator" }),
  publishedBy: one(users, { fields: [uiComponents.publishedByAdminId], references: [users.id], relationName: "uiComponentPublisher" }),
  positions: many(componentPositions),
}));

export const componentPositionsRelations = relations(componentPositions, ({ one }) => ({
  layout: one(uiLayouts, { fields: [componentPositions.layoutId], references: [uiLayouts.id] }),
  component: one(uiComponents, { fields: [componentPositions.componentId], references: [uiComponents.id] }),
}));

export const economySettingsRelations = relations(economySettings, ({ one }) => ({
  changedBy: one(users, { fields: [economySettings.changedByAdminId], references: [users.id] }),
}));
