import {
  pgTable, uuid, text, timestamp, integer, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cmsPageStatusEnum, faqCategoryEnum } from "./enums";
import { users } from "./users";

// ─── cms_pages (Terms, Privacy, About, custom pages) ───
export const cmsPages = pgTable("cms_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  locale: text("locale").default("en").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  status: cmsPageStatusEnum("status").default("DRAFT").notNull(),
  version: integer("version").default(1).notNull(),
  publishedAt: timestamp("published_at"),
  publishedByAdminId: uuid("published_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("cms_pages_slug_locale_idx").on(t.slug, t.locale),
  index("cms_pages_status_idx").on(t.status),
]);

// ─── faq_entries ───
export const faqEntries = pgTable("faq_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: faqCategoryEnum("category").notNull(),
  locale: text("locale").default("en").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  helpfulCount: integer("helpful_count").default(0).notNull(),
  notHelpfulCount: integer("not_helpful_count").default(0).notNull(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("faq_entries_category_locale_order_idx").on(t.category, t.locale, t.displayOrder),
  index("faq_entries_published_idx").on(t.isPublished),
]);

// ─── announcements (platform-wide or targeted announcements) ───
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  targetAudience: text("target_audience").default("ALL").notNull(),
  targetRegionsJson: jsonb("target_regions_json"),
  deepLink: text("deep_link"),
  imageUrl: text("image_url"),
  priority: integer("priority").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  createdByAdminId: uuid("created_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("announcements_active_starts_idx").on(t.isActive, t.startsAt),
  index("announcements_audience_idx").on(t.targetAudience),
]);

// ─── Relations ───
export const cmsPagesRelations = relations(cmsPages, ({ one }) => ({
  publishedBy: one(users, { fields: [cmsPages.publishedByAdminId], references: [users.id] }),
}));

export const faqEntriesRelations = relations(faqEntries, ({ one }) => ({
  updatedBy: one(users, { fields: [faqEntries.updatedByAdminId], references: [users.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  createdBy: one(users, { fields: [announcements.createdByAdminId], references: [users.id] }),
}));
