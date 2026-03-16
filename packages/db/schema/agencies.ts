import {
  pgTable, uuid, text, timestamp, index, uniqueIndex, decimal, jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { agencyHostStatusEnum, agencyApplicationStatusEnum, agencyCommissionStatusEnum } from "./enums";
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

export const agencyApplications = pgTable("agency_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicantUserId: uuid("applicant_user_id").notNull().references(() => users.id),
  agencyName: text("agency_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  country: text("country").notNull(),
  notes: text("notes"),
  status: agencyApplicationStatusEnum("status").default("PENDING").notNull(),
  createdAgencyId: uuid("created_agency_id").references(() => agencies.id),
  reviewedByAdminId: uuid("reviewed_by_admin_id").references(() => admins.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("agency_applications_status_created_idx").on(t.status, t.createdAt),
  index("agency_applications_applicant_status_idx").on(t.applicantUserId, t.status, t.createdAt),
]);

export const agencyCommissionRecords = pgTable("agency_commission_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  grossRevenueUsd: decimal("gross_revenue_usd", { precision: 12, scale: 2 }).notNull(),
  hostPayoutUsd: decimal("host_payout_usd", { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull(),
  commissionAmountUsd: decimal("commission_amount_usd", { precision: 12, scale: 2 }).notNull(),
  status: agencyCommissionStatusEnum("status").default("PENDING").notNull(),
  metadataJson: jsonb("metadata_json"),
  approvedByAdminId: uuid("approved_by_admin_id").references(() => admins.id),
  approvedAt: timestamp("approved_at"),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("agency_commissions_agency_status_period_idx").on(t.agencyId, t.status, t.periodStart),
  index("agency_commissions_host_period_idx").on(t.hostUserId, t.periodStart),
]);

// ─── Relations ───
export const agenciesRelations = relations(agencies, ({ many }) => ({
  hosts: many(agencyHosts),
  applications: many(agencyApplications),
  commissions: many(agencyCommissionRecords),
}));

export const agencyHostsRelations = relations(agencyHosts, ({ one }) => ({
  agency: one(agencies, { fields: [agencyHosts.agencyId], references: [agencies.id] }),
  user: one(users, { fields: [agencyHosts.userId], references: [users.id] }),
}));

export const agencyApplicationsRelations = relations(agencyApplications, ({ one }) => ({
  applicant: one(users, { fields: [agencyApplications.applicantUserId], references: [users.id], relationName: "agencyApplicant" }),
  agency: one(agencies, { fields: [agencyApplications.createdAgencyId], references: [agencies.id] }),
}));

export const agencyCommissionRecordsRelations = relations(agencyCommissionRecords, ({ one }) => ({
  agency: one(agencies, { fields: [agencyCommissionRecords.agencyId], references: [agencies.id] }),
  host: one(users, { fields: [agencyCommissionRecords.hostUserId], references: [users.id], relationName: "agencyCommissionHost" }),
}));
