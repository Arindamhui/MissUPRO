import {
  pgTable, uuid, text, timestamp, decimal, integer, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { refundStatusEnum, refundReasonEnum, refundMethodEnum, paymentProviderEnum } from "./enums";
import { users } from "./users";
import { payments } from "./payments";
import { admins } from "./admin";

// ─── refunds (full lifecycle tracking) ───
export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").notNull().references(() => payments.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  reason: refundReasonEnum("reason").notNull(),
  reasonDetails: text("reason_details"),
  refundMethod: refundMethodEnum("refund_method").default("ORIGINAL_PAYMENT").notNull(),
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }).notNull(),
  coinsDeducted: integer("coins_deducted").default(0).notNull(),
  provider: paymentProviderEnum("provider").notNull(),
  providerRefundId: text("provider_refund_id"),
  status: refundStatusEnum("status").default("REQUESTED").notNull(),
  requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
  reviewedByAdminId: uuid("reviewed_by_admin_id").references(() => admins.id),
  reviewNote: text("review_note"),
  idempotencyKey: text("idempotency_key").notNull(),
  metadataJson: jsonb("metadata_json"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("refunds_payment_idx").on(t.paymentId),
  index("refunds_user_status_idx").on(t.userId, t.status, t.requestedAt),
  index("refunds_status_requested_idx").on(t.status, t.requestedAt),
  uniqueIndex("refunds_idempotency_idx").on(t.idempotencyKey),
  uniqueIndex("refunds_provider_refund_idx").on(t.providerRefundId),
]);

// ─── Relations ───
export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, { fields: [refunds.paymentId], references: [payments.id] }),
  user: one(users, { fields: [refunds.userId], references: [users.id] }),
  requestedBy: one(users, { fields: [refunds.requestedByUserId], references: [users.id], relationName: "refundRequester" }),
  reviewedBy: one(admins, { fields: [refunds.reviewedByAdminId], references: [admins.id], relationName: "refundReviewer" }),
}));
