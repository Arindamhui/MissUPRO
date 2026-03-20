import {
  pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  hostApplicationStatusEnum,
  hostLifecycleStatusEnum,
  hostTypeEnum,
} from "./enums";
import { agencies } from "./agencies";
import { users } from "./users";

export const hostApplications = pgTable("host_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  agencyId: uuid("agency_id").references(() => agencies.id),
  applicationType: hostTypeEnum("application_type").notNull(),
  status: hostApplicationStatusEnum("status").default("PENDING").notNull(),
  agencyCodeSnapshot: text("agency_code_snapshot"),
  talentDetailsJson: jsonb("talent_details_json").notNull(),
  profileInfoJson: jsonb("profile_info_json").notNull(),
  idProofUrlsJson: jsonb("id_proof_urls_json").notNull(),
  reviewNotes: text("review_notes"),
  reviewedByAdminUserId: uuid("reviewed_by_admin_user_id").references(() => users.id),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("host_applications_status_submitted_idx").on(t.status, t.submittedAt),
  index("host_applications_user_status_idx").on(t.userId, t.status, t.submittedAt),
  index("host_applications_agency_status_idx").on(t.agencyId, t.status, t.submittedAt),
]);

export const hosts = pgTable("hosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: text("host_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id),
  agencyId: uuid("agency_id").references(() => agencies.id),
  type: hostTypeEnum("type").notNull(),
  status: hostLifecycleStatusEnum("status").default("PENDING").notNull(),
  talentDetailsJson: jsonb("talent_details_json"),
  profileInfoJson: jsonb("profile_info_json"),
  idProofUrlsJson: jsonb("id_proof_urls_json"),
  sourceApplicationId: uuid("source_application_id").references(() => hostApplications.id),
  reviewNotes: text("review_notes"),
  reviewedByAdminUserId: uuid("reviewed_by_admin_user_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("hosts_host_id_idx").on(t.hostId),
  uniqueIndex("hosts_user_id_idx").on(t.userId),
  index("hosts_agency_status_idx").on(t.agencyId, t.status, t.createdAt),
  index("hosts_type_status_idx").on(t.type, t.status, t.createdAt),
]);

export const hostApplicationsRelations = relations(hostApplications, ({ one }) => ({
  user: one(users, { fields: [hostApplications.userId], references: [users.id] }),
  agency: one(agencies, { fields: [hostApplications.agencyId], references: [agencies.id] }),
  reviewer: one(users, { fields: [hostApplications.reviewedByAdminUserId], references: [users.id], relationName: "hostApplicationReviewer" }),
}));

export const hostsRelations = relations(hosts, ({ one }) => ({
  user: one(users, { fields: [hosts.userId], references: [users.id] }),
  agency: one(agencies, { fields: [hosts.agencyId], references: [agencies.id] }),
  sourceApplication: one(hostApplications, { fields: [hosts.sourceApplicationId], references: [hostApplications.id] }),
  reviewer: one(users, { fields: [hosts.reviewedByAdminUserId], references: [users.id], relationName: "hostReviewer" }),
}));