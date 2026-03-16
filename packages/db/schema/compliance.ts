import {
  pgTable, uuid, text, timestamp, jsonb, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { dataExportStatusEnum } from "./enums";
import { users } from "./users";

export const dataExportRequests = pgTable("data_export_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: dataExportStatusEnum("status").default("REQUESTED").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processingStartedAt: timestamp("processing_started_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  retentionUntil: timestamp("retention_until"),
  downloadUrl: text("download_url"),
  failureReason: text("failure_reason"),
  payloadJson: jsonb("payload_json"),
  processedByAdminId: uuid("processed_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("data_export_requests_user_status_idx").on(t.userId, t.status, t.requestedAt),
  index("data_export_requests_status_requested_idx").on(t.status, t.requestedAt),
  index("data_export_requests_retention_idx").on(t.retentionUntil),
]);

export const dataExportRequestsRelations = relations(dataExportRequests, ({ one }) => ({
  user: one(users, { fields: [dataExportRequests.userId], references: [users.id], relationName: "dataExportUser" }),
  processedBy: one(users, { fields: [dataExportRequests.processedByAdminId], references: [users.id], relationName: "dataExportProcessor" }),
}));
