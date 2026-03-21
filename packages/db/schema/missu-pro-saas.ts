import {
  pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex, integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { agencyApplicationStatusEnum, hostApplicationStatusEnum, hostTypeEnum } from "./enums";
import { agencies } from "./agencies";
import { users } from "./users";

export const agencyRequests = pgTable("agency_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  status: agencyApplicationStatusEnum("status").default("PENDING").notNull(),
  notes: text("notes"),
  metadataJson: jsonb("metadata_json"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("agency_requests_user_status_idx").on(t.userId, t.status, t.createdAt),
  index("agency_requests_agency_status_idx").on(t.agencyId, t.status, t.createdAt),
  index("agency_requests_deleted_at_idx").on(t.deletedAt),
]);

export const hostRequests = pgTable("host_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  agencyId: uuid("agency_id").references(() => agencies.id),
  requestType: hostTypeEnum("request_type").notNull(),
  documentsJson: jsonb("documents_json").notNull(),
  talentInfo: text("talent_info").notNull(),
  storageKeysJson: jsonb("storage_keys_json"),
  status: hostApplicationStatusEnum("status").default("PENDING").notNull(),
  idempotencyKey: text("idempotency_key"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("host_requests_idempotency_idx").on(t.idempotencyKey),
  index("host_requests_user_status_idx").on(t.userId, t.status, t.createdAt),
  index("host_requests_agency_status_idx").on(t.agencyId, t.status, t.createdAt),
  index("host_requests_type_status_idx").on(t.requestType, t.status, t.createdAt),
  index("host_requests_deleted_at_idx").on(t.deletedAt),
]);

export const outboxEvents = pgTable("outbox_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventName: text("event_name").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  status: text("status").default("PENDING").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  availableAt: timestamp("available_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("outbox_events_status_available_idx").on(t.status, t.availableAt),
  index("outbox_events_aggregate_idx").on(t.aggregateType, t.aggregateId, t.createdAt),
  index("outbox_events_name_created_idx").on(t.eventName, t.createdAt),
]);

export const agencyRequestsRelations = relations(agencyRequests, ({ one }) => ({
  user: one(users, { fields: [agencyRequests.userId], references: [users.id] }),
  agency: one(agencies, { fields: [agencyRequests.agencyId], references: [agencies.id] }),
  reviewer: one(users, { fields: [agencyRequests.reviewedByUserId], references: [users.id], relationName: "agencyRequestReviewer" }),
}));

export const hostRequestsRelations = relations(hostRequests, ({ one }) => ({
  user: one(users, { fields: [hostRequests.userId], references: [users.id] }),
  agency: one(agencies, { fields: [hostRequests.agencyId], references: [agencies.id] }),
  reviewer: one(users, { fields: [hostRequests.reviewedByUserId], references: [users.id], relationName: "hostRequestReviewer" }),
}));