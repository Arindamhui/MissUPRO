import {
  pgTable, uuid, text, integer, timestamp, decimal, date, boolean, jsonb,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// ──────────────────────────────────────────────────────────────────
// MATERIALIZED VIEW BACKING TABLES
// These tables are periodically refreshed by background jobs and serve
// as high-performance query targets for admin dashboards and analytics.
// They replace the need for expensive real-time aggregation queries.
// ──────────────────────────────────────────────────────────────────

// ─── mv_revenue_summary (refreshed every 5 minutes) ───
export const mvRevenueSummary = pgTable("mv_revenue_summary", {
  id: uuid("id").primaryKey().defaultRandom(),
  summaryDate: date("summary_date").notNull(),
  source: text("source").notNull(),
  country: text("country"),
  totalGrossUsd: decimal("total_gross_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalPlatformFeeUsd: decimal("total_platform_fee_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalHostPayoutUsd: decimal("total_host_payout_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalAgencyCommissionUsd: decimal("total_agency_commission_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  netPlatformRevenueUsd: decimal("net_platform_revenue_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  transactionCount: integer("transaction_count").default(0).notNull(),
  uniquePayerCount: integer("unique_payer_count").default(0).notNull(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("mv_revenue_summary_date_source_country_idx").on(t.summaryDate, t.source, t.country),
  index("mv_revenue_summary_date_idx").on(t.summaryDate),
  index("mv_revenue_summary_source_idx").on(t.source, t.summaryDate),
]);

// ─── mv_active_users (refreshed every 15 minutes) ───
export const mvActiveUsers = pgTable("mv_active_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotDate: date("snapshot_date").notNull(),
  windowType: text("window_type").notNull(),
  totalActiveUsers: integer("total_active_users").default(0).notNull(),
  totalActiveHosts: integer("total_active_hosts").default(0).notNull(),
  totalActiveAgencies: integer("total_active_agencies").default(0).notNull(),
  newUsersCount: integer("new_users_count").default(0).notNull(),
  returningUsersCount: integer("returning_users_count").default(0).notNull(),
  activeByCountryJson: jsonb("active_by_country_json"),
  activeByPlatformJson: jsonb("active_by_platform_json"),
  peakConcurrentUsers: integer("peak_concurrent_users").default(0).notNull(),
  avgSessionDurationSeconds: integer("avg_session_duration_seconds").default(0).notNull(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("mv_active_users_date_window_idx").on(t.snapshotDate, t.windowType),
  index("mv_active_users_date_idx").on(t.snapshotDate),
]);

// ─── mv_host_performance (refreshed every 30 minutes) ───
export const mvHostPerformance = pgTable("mv_host_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  snapshotDate: date("snapshot_date").notNull(),
  totalCallMinutes: integer("total_call_minutes").default(0).notNull(),
  totalCallSessions: integer("total_call_sessions").default(0).notNull(),
  avgCallDurationSeconds: integer("avg_call_duration_seconds").default(0).notNull(),
  totalLiveStreamMinutes: integer("total_live_stream_minutes").default(0).notNull(),
  totalLiveSessions: integer("total_live_sessions").default(0).notNull(),
  totalViewers: integer("total_viewers").default(0).notNull(),
  uniqueViewers: integer("unique_viewers").default(0).notNull(),
  peakViewerCount: integer("peak_viewer_count").default(0).notNull(),
  totalGiftsReceivedCoins: integer("total_gifts_received_coins").default(0).notNull(),
  totalGiftsReceivedDiamonds: integer("total_gifts_received_diamonds").default(0).notNull(),
  totalGiftTransactions: integer("total_gift_transactions").default(0).notNull(),
  totalEarningsUsd: decimal("total_earnings_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  avgRating: decimal("avg_rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0).notNull(),
  followerDelta: integer("follower_delta").default(0).notNull(),
  totalPkBattles: integer("total_pk_battles").default(0).notNull(),
  pkWinRate: decimal("pk_win_rate", { precision: 5, scale: 2 }),
  onlineMinutes: integer("online_minutes").default(0).notNull(),
  responseRate: decimal("response_rate", { precision: 5, scale: 2 }),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("mv_host_performance_host_date_idx").on(t.hostUserId, t.snapshotDate),
  index("mv_host_performance_date_earnings_idx").on(t.snapshotDate, t.totalEarningsUsd),
  index("mv_host_performance_date_quality_idx").on(t.snapshotDate, t.qualityScore),
  index("mv_host_performance_date_viewers_idx").on(t.snapshotDate, t.totalViewers),
]);

// ─── mv_agency_revenue (refreshed every 30 minutes) ───
export const mvAgencyRevenue = pgTable("mv_agency_revenue", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull(),
  snapshotDate: date("snapshot_date").notNull(),
  totalHostCount: integer("total_host_count").default(0).notNull(),
  activeHostCount: integer("active_host_count").default(0).notNull(),
  totalGrossRevenueUsd: decimal("total_gross_revenue_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalCommissionUsd: decimal("total_commission_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalHostPayoutsUsd: decimal("total_host_payouts_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalCallMinutes: integer("total_call_minutes").default(0).notNull(),
  totalLiveMinutes: integer("total_live_minutes").default(0).notNull(),
  totalGiftsReceivedCoins: integer("total_gifts_received_coins").default(0).notNull(),
  avgHostRating: decimal("avg_host_rating", { precision: 3, scale: 2 }),
  topHostUserId: uuid("top_host_user_id"),
  topHostEarningsUsd: decimal("top_host_earnings_usd", { precision: 14, scale: 4 }),
  country: text("country"),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("mv_agency_revenue_agency_date_idx").on(t.agencyId, t.snapshotDate),
  index("mv_agency_revenue_date_commission_idx").on(t.snapshotDate, t.totalCommissionUsd),
  index("mv_agency_revenue_agency_idx").on(t.agencyId),
]);

// ─── mv_financial_health (platform-wide daily financial health) ───
export const mvFinancialHealth = pgTable("mv_financial_health", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotDate: date("snapshot_date").notNull(),
  totalCoinsSold: integer("total_coins_sold").default(0).notNull(),
  totalRevenueFromSalesUsd: decimal("total_revenue_from_sales_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalCoinsCirculating: integer("total_coins_circulating").default(0).notNull(),
  totalDiamondsOutstanding: integer("total_diamonds_outstanding").default(0).notNull(),
  totalPendingWithdrawalsUsd: decimal("total_pending_withdrawals_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalCompletedWithdrawalsUsd: decimal("total_completed_withdrawals_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  platformNetRevenueUsd: decimal("platform_net_revenue_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalHostPayableUsd: decimal("total_host_payable_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  totalAgencyPayableUsd: decimal("total_agency_payable_usd", { precision: 14, scale: 4 }).default("0").notNull(),
  fraudFlagCount: integer("fraud_flag_count").default(0).notNull(),
  disputeOpenCount: integer("dispute_open_count").default(0).notNull(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("mv_financial_health_date_idx").on(t.snapshotDate),
]);

// ─── mv_fraud_dashboard (refreshed every 10 minutes) ───
export const mvFraudDashboard = pgTable("mv_fraud_dashboard", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotDate: date("snapshot_date").notNull(),
  totalOpenFlags: integer("total_open_flags").default(0).notNull(),
  totalCriticalFlags: integer("total_critical_flags").default(0).notNull(),
  totalHighFlags: integer("total_high_flags").default(0).notNull(),
  suspiciousTransactionCount: integer("suspicious_transaction_count").default(0).notNull(),
  multiAccountClusters: integer("multi_account_clusters").default(0).notNull(),
  rapidCoinDrainAlerts: integer("rapid_coin_drain_alerts").default(0).notNull(),
  fakeEngagementAlerts: integer("fake_engagement_alerts").default(0).notNull(),
  circularGiftingAlerts: integer("circular_gifting_alerts").default(0).notNull(),
  vpnProxyUsageCount: integer("vpn_proxy_usage_count").default(0).notNull(),
  blockedDeviceCount: integer("blocked_device_count").default(0).notNull(),
  totalResolvedToday: integer("total_resolved_today").default(0).notNull(),
  avgResolutionTimeMinutes: integer("avg_resolution_time_minutes").default(0).notNull(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("mv_fraud_dashboard_date_idx").on(t.snapshotDate),
]);

// ─── Relations ───
export const mvHostPerformanceRelations = relations(mvHostPerformance, ({ one }) => ({
  host: one(users, { fields: [mvHostPerformance.hostUserId], references: [users.id] }),
}));
