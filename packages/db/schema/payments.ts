import {
  pgTable, uuid, text, integer, timestamp, decimal, boolean, jsonb,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { paymentProviderEnum, paymentStatusEnum, withdrawStatusEnum, payoutStatusEnum, payoutMethodEnum } from "./enums";
import { users } from "./users";
import { coinPackages } from "./wallets";

// ─── payments ───
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  coinPackageId: uuid("coin_package_id").notNull().references(() => coinPackages.id),
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }).notNull(),
  coinsCredited: integer("coins_credited").notNull(),
  provider: paymentProviderEnum("provider").notNull(),
  providerPaymentId: text("provider_payment_id"),
  providerTransactionId: text("provider_transaction_id"),
  status: paymentStatusEnum("status").default("PENDING").notNull(),
  failureReason: text("failure_reason"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundedAt: timestamp("refunded_at"),
  idempotencyKey: text("idempotency_key").notNull(),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("payments_user_created_idx").on(t.userId, t.createdAt),
  uniqueIndex("payments_provider_payment_idx").on(t.provider, t.providerPaymentId),
  index("payments_status_created_idx").on(t.status, t.createdAt),
  uniqueIndex("payments_idempotency_idx").on(t.idempotencyKey),
]);

// ─── withdraw_requests ───
export const withdrawRequests = pgTable("withdraw_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  audioMinutesSnapshot: integer("audio_minutes_snapshot").notNull(),
  videoMinutesSnapshot: integer("video_minutes_snapshot").notNull(),
  audioRateSnapshot: decimal("audio_rate_snapshot", { precision: 10, scale: 4 }).notNull(),
  videoRateSnapshot: decimal("video_rate_snapshot", { precision: 10, scale: 4 }).notNull(),
  callEarningsSnapshot: decimal("call_earnings_snapshot", { precision: 12, scale: 2 }).notNull(),
  diamondBalanceSnapshot: integer("diamond_balance_snapshot").notNull(),
  diamondEarningsSnapshot: decimal("diamond_earnings_snapshot", { precision: 12, scale: 2 }).notNull(),
  totalPayoutAmount: decimal("total_payout_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  payoutMethod: payoutMethodEnum("payout_method").notNull(),
  payoutDetailsJson: jsonb("payout_details_json").notNull(),
  status: withdrawStatusEnum("status").default("PENDING").notNull(),
  rejectionReason: text("rejection_reason"),
  approvedByAdminId: uuid("approved_by_admin_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  fraudRiskScore: integer("fraud_risk_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("withdraw_model_status_created_idx").on(t.modelUserId, t.status, t.createdAt),
  index("withdraw_status_created_idx").on(t.status, t.createdAt),
  index("withdraw_fraud_status_idx").on(t.fraudRiskScore, t.status),
]);

// ─── payout_records (immutable) ───
export const payoutRecords = pgTable("payout_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelUserId: uuid("model_user_id").notNull().references(() => users.id),
  withdrawRequestId: uuid("withdraw_request_id").notNull().references(() => withdrawRequests.id),
  audioMinutesPaid: integer("audio_minutes_paid").notNull(),
  videoMinutesPaid: integer("video_minutes_paid").notNull(),
  audioRateSnapshot: decimal("audio_rate_snapshot", { precision: 10, scale: 4 }).notNull(),
  videoRateSnapshot: decimal("video_rate_snapshot", { precision: 10, scale: 4 }).notNull(),
  audioEarnings: decimal("audio_earnings", { precision: 12, scale: 2 }).notNull(),
  videoEarnings: decimal("video_earnings", { precision: 12, scale: 2 }).notNull(),
  diamondEarnings: decimal("diamond_earnings", { precision: 12, scale: 2 }).notNull(),
  totalPayoutAmount: decimal("total_payout_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  payoutMethod: text("payout_method").notNull(),
  status: payoutStatusEnum("status").default("PENDING").notNull(),
  approvedByAdminId: uuid("approved_by_admin_id").notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("payout_model_status_idx").on(t.modelUserId, t.status),
  index("payout_withdraw_idx").on(t.withdrawRequestId),
]);

// ─── webhook_events ───
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: paymentProviderEnum("provider").notNull(),
  providerEventId: text("provider_event_id").notNull(),
  signatureValid: boolean("signature_valid").notNull(),
  payloadHash: text("payload_hash").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  processingStatus: text("processing_status"),
  failureReason: text("failure_reason"),
}, (t) => [
  index("webhook_provider_event_idx").on(t.provider, t.providerEventId),
  uniqueIndex("webhook_provider_event_unique_idx").on(t.provider, t.providerEventId),
]);

// ─── Relations ───
export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  coinPackage: one(coinPackages, { fields: [payments.coinPackageId], references: [coinPackages.id] }),
}));

export const withdrawRequestsRelations = relations(withdrawRequests, ({ one }) => ({
  model: one(users, { fields: [withdrawRequests.modelUserId], references: [users.id] }),
  approvedBy: one(users, { fields: [withdrawRequests.approvedByAdminId], references: [users.id], relationName: "approver" }),
  payout: one(payoutRecords),
}));

export const payoutRecordsRelations = relations(payoutRecords, ({ one }) => ({
  model: one(users, { fields: [payoutRecords.modelUserId], references: [users.id] }),
  withdrawRequest: one(withdrawRequests, { fields: [payoutRecords.withdrawRequestId], references: [withdrawRequests.id] }),
}));
