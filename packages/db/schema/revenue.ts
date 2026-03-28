import {
  pgTable, uuid, text, integer, timestamp, decimal, boolean, jsonb,
  index, uniqueIndex, check, date,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  revenueSourceEnum, earningSourceEnum, settlementPeriodEnum,
  agencySettlementStatusEnum, payoutMethodEnum, payoutStatusEnum,
} from "./enums";
import { users } from "./users";
import { agencies } from "./agencies";
import { admins } from "./admin";

// ─── platform_revenue (append-only, one record per revenue event) ───
export const platformRevenue = pgTable("platform_revenue", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: revenueSourceEnum("source").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: uuid("reference_id").notNull(),
  grossAmountCoins: integer("gross_amount_coins").default(0).notNull(),
  grossAmountDiamonds: integer("gross_amount_diamonds").default(0).notNull(),
  grossAmountUsd: decimal("gross_amount_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  platformFeeCoins: integer("platform_fee_coins").default(0).notNull(),
  platformFeeDiamonds: integer("platform_fee_diamonds").default(0).notNull(),
  platformFeeUsd: decimal("platform_fee_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  hostPayoutCoins: integer("host_payout_coins").default(0).notNull(),
  hostPayoutDiamonds: integer("host_payout_diamonds").default(0).notNull(),
  hostPayoutUsd: decimal("host_payout_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  agencyCommissionCoins: integer("agency_commission_coins").default(0).notNull(),
  agencyCommissionUsd: decimal("agency_commission_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  hostUserId: uuid("host_user_id").references(() => users.id),
  agencyId: uuid("agency_id").references(() => agencies.id),
  payerUserId: uuid("payer_user_id").references(() => users.id),
  country: text("country"),
  currency: text("currency").default("USD").notNull(),
  platformFeeRateBps: integer("platform_fee_rate_bps").notNull(),
  hostShareRateBps: integer("host_share_rate_bps").notNull(),
  agencyCommissionRateBps: integer("agency_commission_rate_bps").default(0).notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("platform_revenue_idempotency_idx").on(t.idempotencyKey),
  index("platform_revenue_source_created_idx").on(t.source, t.createdAt),
  index("platform_revenue_host_created_idx").on(t.hostUserId, t.createdAt),
  index("platform_revenue_agency_created_idx").on(t.agencyId, t.createdAt),
  index("platform_revenue_payer_created_idx").on(t.payerUserId, t.createdAt),
  index("platform_revenue_country_source_idx").on(t.country, t.source, t.createdAt),
  index("platform_revenue_ref_idx").on(t.referenceType, t.referenceId),
]);

// ─── platform_revenue_daily (daily aggregation) ───
export const platformRevenueDaily = pgTable("platform_revenue_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  revenueDate: date("revenue_date").notNull(),
  source: revenueSourceEnum("source").notNull(),
  country: text("country"),
  totalGrossCoins: integer("total_gross_coins").default(0).notNull(),
  totalGrossUsd: decimal("total_gross_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalPlatformFeeCoins: integer("total_platform_fee_coins").default(0).notNull(),
  totalPlatformFeeUsd: decimal("total_platform_fee_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalHostPayoutUsd: decimal("total_host_payout_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalAgencyCommissionUsd: decimal("total_agency_commission_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  transactionCount: integer("transaction_count").default(0).notNull(),
  uniquePayerCount: integer("unique_payer_count").default(0).notNull(),
  uniqueHostCount: integer("unique_host_count").default(0).notNull(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("platform_revenue_daily_date_source_country_idx").on(t.revenueDate, t.source, t.country),
  index("platform_revenue_daily_date_idx").on(t.revenueDate),
  index("platform_revenue_daily_source_date_idx").on(t.source, t.revenueDate),
]);

// ─── host_earnings (per-source tracking for each host) ───
export const hostEarnings = pgTable("host_earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  source: earningSourceEnum("source").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: uuid("reference_id").notNull(),
  grossAmountCoins: integer("gross_amount_coins").default(0).notNull(),
  grossAmountDiamonds: integer("gross_amount_diamonds").default(0).notNull(),
  grossAmountUsd: decimal("gross_amount_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  platformFeeUsd: decimal("platform_fee_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  agencyCommissionUsd: decimal("agency_commission_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  netEarningUsd: decimal("net_earning_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  netEarningDiamonds: integer("net_earning_diamonds").default(0).notNull(),
  agencyId: uuid("agency_id").references(() => agencies.id),
  platformFeeRateBps: integer("platform_fee_rate_bps").notNull(),
  agencyCommissionRateBps: integer("agency_commission_rate_bps").default(0).notNull(),
  hostShareRateBps: integer("host_share_rate_bps").notNull(),
  isSettled: boolean("is_settled").default(false).notNull(),
  settledAt: timestamp("settled_at"),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("host_earnings_idempotency_idx").on(t.idempotencyKey),
  index("host_earnings_host_source_created_idx").on(t.hostUserId, t.source, t.createdAt),
  index("host_earnings_host_settled_idx").on(t.hostUserId, t.isSettled, t.createdAt),
  index("host_earnings_agency_created_idx").on(t.agencyId, t.createdAt),
  index("host_earnings_ref_idx").on(t.referenceType, t.referenceId),
]);

// ─── host_earnings_daily (daily aggregation per host) ───
export const hostEarningsDaily = pgTable("host_earnings_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  earningDate: date("earning_date").notNull(),
  source: earningSourceEnum("source").notNull(),
  totalGrossCoins: integer("total_gross_coins").default(0).notNull(),
  totalGrossUsd: decimal("total_gross_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalNetEarningUsd: decimal("total_net_earning_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalNetEarningDiamonds: integer("total_net_earning_diamonds").default(0).notNull(),
  totalPlatformFeeUsd: decimal("total_platform_fee_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalAgencyCommissionUsd: decimal("total_agency_commission_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  transactionCount: integer("transaction_count").default(0).notNull(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("host_earnings_daily_host_date_source_idx").on(t.hostUserId, t.earningDate, t.source),
  index("host_earnings_daily_host_date_idx").on(t.hostUserId, t.earningDate),
  index("host_earnings_daily_date_source_idx").on(t.earningDate, t.source),
]);

// ─── agency_earnings (per-host commission tracking) ───
export const agencyEarnings = pgTable("agency_earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  source: earningSourceEnum("source").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: uuid("reference_id").notNull(),
  grossHostEarningUsd: decimal("gross_host_earning_usd", { precision: 14, scale: 4 }).notNull(),
  commissionRateBps: integer("commission_rate_bps").notNull(),
  commissionAmountUsd: decimal("commission_amount_usd", { precision: 14, scale: 4 }).notNull(),
  isSettled: boolean("is_settled").default(false).notNull(),
  settlementId: uuid("settlement_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("agency_earnings_idempotency_idx").on(t.idempotencyKey),
  index("agency_earnings_agency_settled_created_idx").on(t.agencyId, t.isSettled, t.createdAt),
  index("agency_earnings_agency_host_created_idx").on(t.agencyId, t.hostUserId, t.createdAt),
  index("agency_earnings_settlement_idx").on(t.settlementId),
  index("agency_earnings_ref_idx").on(t.referenceType, t.referenceId),
]);

// ─── agency_settlements (periodic payout to agencies) ───
export const agencySettlements = pgTable("agency_settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  settlementPeriod: settlementPeriodEnum("settlement_period").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalGrossRevenueUsd: decimal("total_gross_revenue_usd", { precision: 14, scale: 4 }).notNull(),
  totalCommissionUsd: decimal("total_commission_usd", { precision: 14, scale: 4 }).notNull(),
  totalHostPayoutsUsd: decimal("total_host_payouts_usd", { precision: 14, scale: 4 }).notNull(),
  netPayableUsd: decimal("net_payable_usd", { precision: 14, scale: 4 }).notNull(),
  adjustmentsUsd: decimal("adjustments_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  adjustmentNotes: text("adjustment_notes"),
  hostCount: integer("host_count").notNull(),
  transactionCount: integer("transaction_count").notNull(),
  status: agencySettlementStatusEnum("status").default("PENDING").notNull(),
  payoutMethod: payoutMethodEnum("payout_method"),
  payoutDetailsJson: jsonb("payout_details_json"),
  payoutReference: text("payout_reference"),
  approvedByAdminId: uuid("approved_by_admin_id").references(() => admins.id),
  approvedAt: timestamp("approved_at"),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  failureReason: text("failure_reason"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("agency_settlements_agency_status_period_idx").on(t.agencyId, t.status, t.periodStart),
  index("agency_settlements_status_created_idx").on(t.status, t.createdAt),
  index("agency_settlements_period_idx").on(t.periodStart, t.periodEnd),
]);

// ─── agency_balances (current agency balance snapshot) ───
export const agencyBalances = pgTable("agency_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  pendingCommissionUsd: decimal("pending_commission_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  settledCommissionUsd: decimal("settled_commission_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalEarnedUsd: decimal("total_earned_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalWithdrawnUsd: decimal("total_withdrawn_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  currency: text("currency").default("USD").notNull(),
  version: integer("version").default(1).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("agency_balances_agency_idx").on(t.agencyId),
  check("agency_balances_pending_check", sql`${sql.raw("pending_commission_usd")} >= 0`),
]);

// ─── Relations ───
export const platformRevenueRelations = relations(platformRevenue, ({ one }) => ({
  host: one(users, { fields: [platformRevenue.hostUserId], references: [users.id], relationName: "revenueHost" }),
  payer: one(users, { fields: [platformRevenue.payerUserId], references: [users.id], relationName: "revenuePayer" }),
  agency: one(agencies, { fields: [platformRevenue.agencyId], references: [agencies.id] }),
}));

export const hostEarningsRelations = relations(hostEarnings, ({ one }) => ({
  host: one(users, { fields: [hostEarnings.hostUserId], references: [users.id] }),
  agency: one(agencies, { fields: [hostEarnings.agencyId], references: [agencies.id] }),
}));

export const hostEarningsDailyRelations = relations(hostEarningsDaily, ({ one }) => ({
  host: one(users, { fields: [hostEarningsDaily.hostUserId], references: [users.id] }),
}));

export const agencyEarningsRelations = relations(agencyEarnings, ({ one }) => ({
  agency: one(agencies, { fields: [agencyEarnings.agencyId], references: [agencies.id] }),
  host: one(users, { fields: [agencyEarnings.hostUserId], references: [users.id] }),
}));

export const agencySettlementsRelations = relations(agencySettlements, ({ one }) => ({
  agency: one(agencies, { fields: [agencySettlements.agencyId], references: [agencies.id] }),
  approvedBy: one(admins, { fields: [agencySettlements.approvedByAdminId], references: [admins.id] }),
}));

export const agencyBalancesRelations = relations(agencyBalances, ({ one }) => ({
  agency: one(agencies, { fields: [agencyBalances.agencyId], references: [agencies.id] }),
}));
