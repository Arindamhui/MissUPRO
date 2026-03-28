import {
  pgTable, uuid, text, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  consentTypeEnum, consentActionEnum,
  payoutAccountTypeEnum, payoutAccountStatusEnum,
} from "./enums";
import { users } from "./users";

// ─── user_settings (generalized key-value preferences) ───
export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  settingKey: text("setting_key").notNull(),
  settingValue: jsonb("setting_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("user_settings_user_key_idx").on(t.userId, t.settingKey),
]);

// ─── user_consents (GDPR consent tracking — append-only audit trail) ───
export const userConsents = pgTable("user_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  consentType: consentTypeEnum("consent_type").notNull(),
  action: consentActionEnum("action").notNull(),
  version: text("version").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("user_consents_user_type_idx").on(t.userId, t.consentType, t.createdAt),
  index("user_consents_type_action_idx").on(t.consentType, t.action, t.createdAt),
]);

// ─── payout_accounts (encrypted bank/payment accounts for withdrawals) ───
export const payoutAccounts = pgTable("payout_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  accountType: payoutAccountTypeEnum("account_type").notNull(),
  accountLabel: text("account_label"),
  accountHolderName: text("account_holder_name").notNull(),
  encryptedDetailsJson: text("encrypted_details_json").notNull(),
  detailsMaskJson: jsonb("details_mask_json"),
  country: text("country"),
  currency: text("currency"),
  status: payoutAccountStatusEnum("status").default("PENDING_VERIFICATION").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  removedAt: timestamp("removed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("payout_accounts_user_status_idx").on(t.userId, t.status),
  index("payout_accounts_user_default_idx").on(t.userId, t.isDefault),
]);

// ─── stream_recordings (live stream recording references) ───
export const streamRecordings = pgTable("stream_recordings", {
  id: uuid("id").primaryKey().defaultRandom(),
  streamId: uuid("stream_id").notNull(),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  storageKey: text("storage_key").notNull(),
  storageProvider: text("storage_provider").default("R2").notNull(),
  durationSeconds: jsonb("duration_seconds"),
  fileSizeBytes: jsonb("file_size_bytes"),
  format: text("format").default("mp4").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("stream_recordings_stream_idx").on(t.streamId),
  index("stream_recordings_host_created_idx").on(t.hostUserId, t.createdAt),
  index("stream_recordings_expires_idx").on(t.expiresAt),
]);

// ─── maintenance_windows (scheduled maintenance tracking) ───
export const maintenanceWindows = pgTable("maintenance_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  affectedServices: jsonb("affected_services"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdByAdminId: uuid("created_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("maintenance_windows_active_starts_idx").on(t.isActive, t.startsAt),
]);

// ─── rate_limit_rules (configurable rate limit policies) ───
export const rateLimitRules = pgTable("rate_limit_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleName: text("rule_name").notNull(),
  endpoint: text("endpoint").notNull(),
  windowSeconds: jsonb("window_seconds").notNull(),
  maxRequests: jsonb("max_requests").notNull(),
  scope: text("scope").default("USER").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("rate_limit_rules_name_idx").on(t.ruleName),
  index("rate_limit_rules_endpoint_idx").on(t.endpoint),
]);

// ─── Relations ───
export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, { fields: [userConsents.userId], references: [users.id] }),
}));

export const payoutAccountsRelations = relations(payoutAccounts, ({ one }) => ({
  user: one(users, { fields: [payoutAccounts.userId], references: [users.id] }),
}));

export const streamRecordingsRelations = relations(streamRecordings, ({ one }) => ({
  host: one(users, { fields: [streamRecordings.hostUserId], references: [users.id] }),
}));

export const maintenanceWindowsRelations = relations(maintenanceWindows, ({ one }) => ({
  createdBy: one(users, { fields: [maintenanceWindows.createdByAdminId], references: [users.id] }),
}));
