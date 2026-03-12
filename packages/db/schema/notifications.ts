import {
  pgTable, uuid, text, integer, timestamp, boolean, time, jsonb, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  notificationTypeEnum, notificationChannelEnum, notificationDeliveryStatusEnum,
  notificationCategoryEnum, senderTypeEnum, systemMessageTypeEnum,
  notificationCampaignTypeEnum, notificationCampaignStatusEnum,
  scheduleTypeEnum, notificationAllChannelEnum,
} from "./enums";
import { users } from "./users";

// ─── notifications ───
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  notificationType: notificationTypeEnum("notification_type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  iconUrl: text("icon_url"),
  deepLink: text("deep_link"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  metadataJson: jsonb("metadata_json"),
  channel: notificationChannelEnum("channel").notNull(),
  deliveryStatus: notificationDeliveryStatusEnum("delivery_status").default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("notifications_user_read_created_idx").on(t.userId, t.isRead, t.createdAt),
  index("notifications_user_type_created_idx").on(t.userId, t.notificationType, t.createdAt),
  index("notifications_delivery_created_idx").on(t.deliveryStatus, t.createdAt),
]);

// ─── notification_preferences ───
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  channel: notificationChannelEnum("channel").notNull(),
  category: notificationCategoryEnum("category").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  quietHoursStart: time("quiet_hours_start"),
  quietHoursEnd: time("quiet_hours_end"),
  quietHoursTimezone: text("quiet_hours_timezone"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("notification_prefs_user_idx").on(t.userId),
]);

// ─── notification_templates ───
export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateKey: text("template_key").notNull(),
  locale: text("locale").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  titleTemplate: text("title_template").notNull(),
  bodyTemplate: text("body_template").notNull(),
  variablesJson: jsonb("variables_json"),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("notification_templates_key_locale_channel_version_idx").on(t.templateKey, t.locale, t.channel, t.version),
]);

// ─── notification_campaigns ───
export const notificationCampaigns = pgTable("notification_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  campaignType: notificationCampaignTypeEnum("campaign_type").notNull(),
  templateId: uuid("template_id").notNull().references(() => notificationTemplates.id),
  segmentRuleJson: jsonb("segment_rule_json").notNull(),
  channel: notificationAllChannelEnum("channel").notNull(),
  scheduleType: scheduleTypeEnum("schedule_type").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  recurringCron: text("recurring_cron"),
  status: notificationCampaignStatusEnum("status").default("DRAFT").notNull(),
  totalRecipients: integer("total_recipients"),
  deliveredCount: integer("delivered_count"),
  openedCount: integer("opened_count"),
  budgetCapRecipients: integer("budget_cap_recipients"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("notification_campaigns_status_scheduled_idx").on(t.status, t.scheduledAt),
  index("notification_campaigns_type_status_idx").on(t.campaignType, t.status),
  index("notification_campaigns_admin_created_idx").on(t.createdByAdminId, t.createdAt),
]);

// ─── messages (system/admin messages) ───
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderType: senderTypeEnum("sender_type").notNull(),
  senderId: uuid("sender_id").references(() => users.id),
  recipientUserId: uuid("recipient_user_id").notNull().references(() => users.id),
  messageType: systemMessageTypeEnum("message_type").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  deepLink: text("deep_link"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("messages_recipient_read_created_idx").on(t.recipientUserId, t.isRead, t.createdAt),
  index("messages_type_created_idx").on(t.messageType, t.createdAt),
]);

// ─── Relations ───
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));

export const notificationCampaignsRelations = relations(notificationCampaigns, ({ one }) => ({
  template: one(notificationTemplates, { fields: [notificationCampaigns.templateId], references: [notificationTemplates.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "msgSender" }),
  recipient: one(users, { fields: [messages.recipientUserId], references: [users.id], relationName: "msgRecipient" }),
}));
