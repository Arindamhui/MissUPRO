import {
  pgTable, uuid, text, timestamp, integer, boolean, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { localeStatusEnum } from "./enums";
import { users } from "./users";

// ─── supported_locales ───
export const supportedLocales = pgTable("supported_locales", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  nativeName: text("native_name").notNull(),
  direction: text("direction").default("ltr").notNull(),
  status: localeStatusEnum("status").default("DRAFT").notNull(),
  completionPercent: integer("completion_percent").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("supported_locales_code_idx").on(t.code),
  index("supported_locales_status_idx").on(t.status),
]);

// ─── translations (key-value i18n strings per locale) ───
export const translations = pgTable("translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  localeCode: text("locale_code").notNull(),
  namespace: text("namespace").default("common").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  version: integer("version").default(1).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("translations_locale_ns_key_idx").on(t.localeCode, t.namespace, t.key),
  index("translations_namespace_idx").on(t.namespace),
  index("translations_verified_idx").on(t.isVerified),
]);

// ─── Relations ───
export const translationsRelations = relations(translations, ({ one }) => ({
  updatedBy: one(users, { fields: [translations.updatedByAdminId], references: [users.id] }),
}));
