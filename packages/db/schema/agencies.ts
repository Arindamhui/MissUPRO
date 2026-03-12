import {
  pgTable, uuid, text, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { agencyHostStatusEnum } from "./enums";
import { users } from "./users";
import { admins } from "./admin";

// ─── agencies ───
export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyName: text("agency_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  country: text("country").notNull(),
  status: text("status").default("PENDING").notNull(),
  commissionTier: text("commission_tier"),
  approvedByAdminId: uuid("approved_by_admin_id").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("agencies_status_idx").on(t.status),
  index("agencies_country_idx").on(t.country),
]);

// ─── agency_hosts ───
export const agencyHosts = pgTable("agency_hosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  status: agencyHostStatusEnum("status").default("ACTIVE").notNull(),
}, (t) => [
  uniqueIndex("agency_hosts_agency_user_idx").on(t.agencyId, t.userId),
  index("agency_hosts_user_idx").on(t.userId),
]);

// ─── Relations ───
export const agenciesRelations = relations(agencies, ({ many }) => ({
  hosts: many(agencyHosts),
}));

export const agencyHostsRelations = relations(agencyHosts, ({ one }) => ({
  agency: one(agencies, { fields: [agencyHosts.agencyId], references: [agencies.id] }),
  user: one(users, { fields: [agencyHosts.userId], references: [users.id] }),
}));
