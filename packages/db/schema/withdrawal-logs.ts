import {
  pgTable, uuid, text, integer, timestamp, jsonb, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { withdrawalActionEnum } from "./enums";
import { users } from "./users";
import { admins } from "./admin";
import { withdrawRequests } from "./payments";

// ─── withdrawal_logs (append-only, tracks every state change) ───
export const withdrawalLogs = pgTable("withdrawal_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  withdrawRequestId: uuid("withdraw_request_id").notNull().references(() => withdrawRequests.id),
  action: withdrawalActionEnum("action").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  actorAdminId: uuid("actor_admin_id").references(() => admins.id),
  fraudRiskScoreSnapshot: integer("fraud_risk_score_snapshot"),
  reason: text("reason"),
  metadataJson: jsonb("metadata_json"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("withdrawal_logs_request_created_idx").on(t.withdrawRequestId, t.createdAt),
  index("withdrawal_logs_action_created_idx").on(t.action, t.createdAt),
  index("withdrawal_logs_actor_admin_created_idx").on(t.actorAdminId, t.createdAt),
  index("withdrawal_logs_actor_user_created_idx").on(t.actorUserId, t.createdAt),
]);

// ─── withdrawal_limits (configurable per-role, per-country limits) ───
export const withdrawalLimits = pgTable("withdrawal_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleType: text("role_type").notNull(),
  countryCode: text("country_code"),
  kycLevel: integer("kyc_level").default(0).notNull(),
  minWithdrawalUsd: text("min_withdrawal_usd").default("10").notNull(),
  maxWithdrawalUsd: text("max_withdrawal_usd").default("5000").notNull(),
  dailyLimitUsd: text("daily_limit_usd").default("2000").notNull(),
  weeklyLimitUsd: text("weekly_limit_usd").default("10000").notNull(),
  monthlyLimitUsd: text("monthly_limit_usd").default("25000").notNull(),
  coolingPeriodHours: integer("cooling_period_hours").default(24).notNull(),
  autoApproveThresholdUsd: text("auto_approve_threshold_usd").default("100").notNull(),
  requiresAdminApproval: text("requires_admin_approval").default("true").notNull(),
  isActive: text("is_active").default("true").notNull(),
  createdByAdminId: uuid("created_by_admin_id").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("withdrawal_limits_role_country_kyc_idx").on(t.roleType, t.countryCode, t.kycLevel),
]);

// ─── Relations ───
export const withdrawalLogsRelations = relations(withdrawalLogs, ({ one }) => ({
  withdrawRequest: one(withdrawRequests, { fields: [withdrawalLogs.withdrawRequestId], references: [withdrawRequests.id] }),
  actorUser: one(users, { fields: [withdrawalLogs.actorUserId], references: [users.id], relationName: "withdrawalLogUser" }),
  actorAdmin: one(admins, { fields: [withdrawalLogs.actorAdminId], references: [admins.id], relationName: "withdrawalLogAdmin" }),
}));
