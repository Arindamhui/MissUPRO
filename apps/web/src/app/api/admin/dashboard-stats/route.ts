import { NextResponse } from "next/server";
import { authenticateRequest } from "@missu/auth";
import { pool } from "@missu/db";
import { logger } from "@missu/logger";
import { getRequestContext } from "@/server/lib/request";

/** Run a raw SQL query and return the first row, or null on error. */
async function safeQuery<T>(sql: string): Promise<T | null> {
  try {
    const { rows } = await pool.query(sql);
    return (rows[0] as T) ?? null;
  } catch (err) {
    logger.warn("dashboard_stats_query_failed", { sql: sql.slice(0, 120), error: String(err) });
    return null;
  }
}

export async function GET(request: Request) {
  const ctx = getRequestContext(request);

  try {
    const claims = await authenticateRequest(request);
    // Accept JWT role ADMIN, or fall back to checking DB for platformRole/authRole
    if (claims.role !== "ADMIN") {
      const { rows } = await pool.query(
        "SELECT platform_role, auth_role FROM users WHERE id = $1 LIMIT 1",
        [claims.sub],
      );
      const row = rows[0] as { platform_role: string; auth_role: string | null } | undefined;
      if (row?.platform_role !== "ADMIN" && row?.auth_role !== "admin") {
        return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
      }
    }
  } catch {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }

  try {
    const [
      totalUsersRow,
      blockedUsersRow,
      vipUsersRow,
      totalAgenciesRow,
      totalHostsRow,
      pendingHostsRow,
      totalImpressionsRow,
      liveHostsRow,
      totalRevenueRow,
      coinsPurchasedRow,
      commissionRow,
      hostEarningsRow,
      payoutsCompleteRow,
      pendingPayoutsRow,
    ] = await Promise.all([
      safeQuery<{ count: string }>("SELECT count(*) AS count FROM users"),
      safeQuery<{ count: string }>("SELECT count(*) AS count FROM users WHERE status = 'BANNED'"),
      safeQuery<{ count: string }>("SELECT count(*) AS count FROM vip_subscriptions WHERE status = 'ACTIVE'"),
      safeQuery<{ count: string }>("SELECT count(*) AS count FROM agencies WHERE approval_status = 'APPROVED'"),
      safeQuery<{ count: string }>("SELECT count(*) AS count FROM hosts WHERE status = 'APPROVED'"),
      safeQuery<{ count: string }>("SELECT count(*) AS count FROM host_applications WHERE status = 'PENDING'"),
      safeQuery<{ total: string | null }>("SELECT coalesce(sum(coin_debit_amount), 0) AS total FROM gift_transactions"),
      safeQuery<{ count: string }>("SELECT count(*) AS count FROM live_rooms WHERE status = 'LIVE'"),
      safeQuery<{ total: string | null }>("SELECT coalesce(sum(amount_usd_cents), 0) AS total FROM payments WHERE status = 'COMPLETED'"),
      safeQuery<{ total: string | null }>("SELECT coalesce(sum(amount), 0) AS total FROM coin_transactions WHERE direction = 'CREDIT' AND reason = 'PURCHASE'"),
      safeQuery<{ total: string | null }>("SELECT coalesce(sum(commission_amount_usd), 0) AS total FROM agency_commission_records"),
      safeQuery<{ total: string | null }>("SELECT coalesce(sum(amount), 0) AS total FROM diamond_transactions WHERE direction = 'CREDIT' AND reason = 'GIFT_CREDIT'"),
      safeQuery<{ total: string | null; count: string }>("SELECT coalesce(sum(payout_amount_usd_cents), 0) AS total, count(*) AS count FROM withdraw_requests WHERE status = 'COMPLETED'"),
      safeQuery<{ total: string | null; count: string }>("SELECT coalesce(sum(payout_amount_usd_cents), 0) AS total, count(*) AS count FROM withdraw_requests WHERE status = 'PENDING'"),
    ]);

    const revenueRawCents = Number(totalRevenueRow?.total ?? 0);
    const payoutsCompleteCents = Number(payoutsCompleteRow?.total ?? 0);
    const pendingPayoutCents = Number(pendingPayoutsRow?.total ?? 0);

    const stats = {
      totalUsers: Number(totalUsersRow?.count ?? 0),
      totalBlockedUsers: Number(blockedUsersRow?.count ?? 0),
      totalVipUsers: Number(vipUsersRow?.count ?? 0),
      totalAgencies: Number(totalAgenciesRow?.count ?? 0),
      totalHosts: Number(totalHostsRow?.count ?? 0),
      pendingHosts: Number(pendingHostsRow?.count ?? 0),
      totalImpressions: Number(totalImpressionsRow?.total ?? 0),
      currentLiveHosts: Number(liveHostsRow?.count ?? 0),
      totalRevenue: Math.round(revenueRawCents) / 100,
      coinsSold: Number(coinsPurchasedRow?.total ?? 0),
      adminCommissionEarned: Number(commissionRow?.total ?? 0),
      hostEarningsGenerated: Number(hostEarningsRow?.total ?? 0),
      hostPayoutsComplete: Math.round(payoutsCompleteCents) / 100,
      hostPayoutsCompleteCount: Number(payoutsCompleteRow?.count ?? 0),
      pendingPayoutLiability: Math.round(pendingPayoutCents) / 100,
      pendingPayoutCount: Number(pendingPayoutsRow?.count ?? 0),
    };

    return NextResponse.json({ ok: true, data: stats, requestId: ctx.requestId });
  } catch (error) {
    logger.error("dashboard_stats_error", { error: String(error), requestId: ctx.requestId });
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to load dashboard stats" } },
      { status: 500 },
    );
  }
}
