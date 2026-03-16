import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { db } from "@missu/db";
import {
  analyticsEvents, users, callSessions, chatSessions, payments,
  giftTransactions, liveStreams, liveViewers, coinTransactions,
  diamondTransactions, models, modelCallStats,
  hostAnalyticsSnapshots, followers, gifts,
} from "@missu/db/schema";
import { eq, and, desc, sql, count, sum, between, inArray } from "drizzle-orm";

@Injectable()
export class AnalyticsService {
  async trackEvent(userId: string, eventType: string, properties: Record<string, any>) {
    await db.insert(analyticsEvents).values({
      userId,
      eventName: eventType,
      payloadJson: properties,
    });
  }

  async getEngagementMetrics(startDate: Date, endDate: Date) {
    const dau = await db
      .select({ date: sql<string>`date(${analyticsEvents.createdAt})`, count: sql<number>`count(distinct ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(between(analyticsEvents.createdAt, startDate, endDate))
      .groupBy(sql`date(${analyticsEvents.createdAt})`)
      .orderBy(sql`date(${analyticsEvents.createdAt})`);

    const totalCalls = await db
      .select({ count: count(), totalDuration: sum(callSessions.totalDurationSeconds) })
      .from(callSessions)
      .where(between(callSessions.createdAt, startDate, endDate));

    const totalChats = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(between(chatSessions.createdAt, startDate, endDate));

    const totalStreams = await db
      .select({ count: count(), totalViewers: sum(liveStreams.viewerCountPeak) })
      .from(liveStreams)
      .where(between(liveStreams.createdAt, startDate, endDate));

    const newUsers = await db
      .select({ count: count() })
      .from(users)
      .where(between(users.createdAt, startDate, endDate));

    return {
      dailyActiveUsers: dau,
      calls: { count: Number(totalCalls[0]?.count ?? 0), totalDurationSeconds: Number(totalCalls[0]?.totalDuration ?? 0) },
      chats: { count: Number(totalChats[0]?.count ?? 0) },
      streams: { count: Number(totalStreams[0]?.count ?? 0), totalViewers: Number(totalStreams[0]?.totalViewers ?? 0) },
      newUsers: Number(newUsers[0]?.count ?? 0),
    };
  }

  async getRevenueAnalytics(startDate: Date, endDate: Date) {
    const paymentRevenue = await db
      .select({
        date: sql<string>`date(${payments.createdAt})`,
        total: sum(payments.amountUsd),
        count: count(),
      })
      .from(payments)
      .where(and(eq(payments.status, "COMPLETED" as any), between(payments.createdAt, startDate, endDate)))
      .groupBy(sql`date(${payments.createdAt})`)
      .orderBy(sql`date(${payments.createdAt})`);

    const giftRevenue = await db
      .select({
        total: sum(giftTransactions.coinCost),
        count: count(),
      })
      .from(giftTransactions)
      .where(between(giftTransactions.createdAt, startDate, endDate));

    const coinsPurchased = await db
      .select({ total: sum(coinTransactions.amount) })
      .from(coinTransactions)
      .where(and(eq(coinTransactions.transactionType, "PURCHASE" as any), between(coinTransactions.createdAt, startDate, endDate)));

    return {
      dailyRevenue: paymentRevenue,
      giftRevenue: { total: Number(giftRevenue[0]?.total ?? 0), count: Number(giftRevenue[0]?.count ?? 0) },
      totalCoinsPurchased: Number(coinsPurchased[0]?.total ?? 0),
    };
  }

  async getUserPaymentHistory(userId: string) {
    const paymentHistory = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));

    const coinHistory = await db
      .select()
      .from(coinTransactions)
      .where(eq(coinTransactions.userId, userId))
      .orderBy(desc(coinTransactions.createdAt))
      .limit(100);

    return { payments: paymentHistory, coinTransactions: coinHistory };
  }

  async getModelEarningsReport(modelUserId: string, startDate: Date, endDate: Date) {
    const [model] = await db.select().from(models).where(eq(models.userId, modelUserId)).limit(1);
    if (!model) throw new Error("Model not found");

    const callEarnings = await db
      .select({
        date: sql<string>`date(${callSessions.createdAt})`,
        total: sum(callSessions.totalCoinsSpent),
        count: count(),
      })
      .from(callSessions)
      .where(and(eq(callSessions.modelUserId, modelUserId), between(callSessions.createdAt, startDate, endDate)))
      .groupBy(sql`date(${callSessions.createdAt})`)
      .orderBy(sql`date(${callSessions.createdAt})`);

    const giftEarnings = await db
      .select({
        total: sum(giftTransactions.diamondCredit),
        count: count(),
      })
      .from(giftTransactions)
      .where(and(eq(giftTransactions.receiverUserId, modelUserId), between(giftTransactions.createdAt, startDate, endDate)));

    const diamondBalance = await db
      .select({ total: sum(diamondTransactions.amount) })
      .from(diamondTransactions)
      .where(eq(diamondTransactions.userId, modelUserId));

    const [stats] = await db.select().from(modelCallStats).where(eq(modelCallStats.modelUserId, modelUserId)).limit(1);

    return {
      dailyCallEarnings: callEarnings,
      giftEarnings: { total: Number(giftEarnings[0]?.total ?? 0), count: Number(giftEarnings[0]?.count ?? 0) },
      totalDiamonds: Number(diamondBalance[0]?.total ?? 0),
      callStats: stats,
    };
  }

  async getCreatorSnapshots(hostUserId: string, startDate: Date, endDate: Date) {
    return db
      .select()
      .from(hostAnalyticsSnapshots)
      .where(
        and(
          eq(hostAnalyticsSnapshots.hostUserId, hostUserId),
          between(hostAnalyticsSnapshots.snapshotDate, startDate.toISOString().slice(0, 10) as any, endDate.toISOString().slice(0, 10) as any),
        ),
      )
      .orderBy(desc(hostAnalyticsSnapshots.snapshotDate));
  }

  async aggregateCreatorSnapshots(snapshotDate: string) {
    const startOfDay = new Date(snapshotDate + "T00:00:00.000Z");
    const endOfDay = new Date(snapshotDate + "T23:59:59.999Z");

    const hosts = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ["HOST", "MODEL"]));

    for (const { id: hostUserId } of hosts) {
      const [diamonds] = await db
        .select({ total: sum(diamondTransactions.amount) })
        .from(diamondTransactions)
        .where(
          and(
            eq(diamondTransactions.userId, hostUserId),
            between(diamondTransactions.createdAt, startOfDay, endOfDay),
          ),
        );

      const streams = await db
        .select({
          id: liveStreams.id,
          durationSeconds: liveStreams.durationSeconds,
        })
        .from(liveStreams)
        .where(
          and(
            eq(liveStreams.hostUserId, hostUserId),
            between(liveStreams.startedAt ?? liveStreams.createdAt, startOfDay, endOfDay),
          ),
        );

      const totalStreams = streams.length;
      const totalWatchMinutes = Math.floor(
        streams.reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0) / 60,
      );

      let uniqueViewers = 0;
      if (streams.length > 0) {
        const streamIds = streams.map((s) => s.id);
        const [uv] = await db
          .select({ count: sql<number>`count(distinct ${liveViewers.userId})` })
          .from(liveViewers)
          .where(inArray(liveViewers.streamId, streamIds));
        uniqueViewers = Number(uv?.count ?? 0);
      }

      const [giftStats] = await db
        .select({
          totalGifts: count(),
          totalDiamondCredit: sum(giftTransactions.diamondCredit),
        })
        .from(giftTransactions)
        .where(
          and(
            eq(giftTransactions.receiverUserId, hostUserId),
            between(giftTransactions.createdAt, startOfDay, endOfDay),
          ),
        );

      const topGift = await db
        .select({
          giftId: giftTransactions.giftId,
          giftCode: gifts.giftCode,
          c: count(),
        })
        .from(giftTransactions)
        .innerJoin(gifts, eq(gifts.id, giftTransactions.giftId))
        .where(
          and(
            eq(giftTransactions.receiverUserId, hostUserId),
            between(giftTransactions.createdAt, startOfDay, endOfDay),
          ),
        )
        .groupBy(giftTransactions.giftId, gifts.giftCode)
        .orderBy(desc(sql`count(*)`))
        .limit(1);

      const [followerDeltaRow] = await db
        .select({ count: count() })
        .from(followers)
        .where(
          and(
            eq(followers.followedUserId, hostUserId),
            between(followers.createdAt, startOfDay, endOfDay),
          ),
        );

      const existing = await db
        .select({ id: hostAnalyticsSnapshots.id })
        .from(hostAnalyticsSnapshots)
        .where(
          and(
            eq(hostAnalyticsSnapshots.hostUserId, hostUserId),
            eq(hostAnalyticsSnapshots.snapshotDate, snapshotDate as any),
          ),
        )
        .limit(1);

      const payload = {
        totalDiamondsEarned: Number(diamonds?.total ?? 0),
        totalStreams,
        totalWatchMinutes,
        uniqueViewers,
        totalGiftsReceived: Number(giftStats?.totalGifts ?? 0),
        topGiftType: topGift[0]?.giftCode ?? null,
        followerDelta: Number(followerDeltaRow?.count ?? 0),
      };

      if (existing[0]) {
        await db
          .update(hostAnalyticsSnapshots)
          .set(payload as any)
          .where(eq(hostAnalyticsSnapshots.id, existing[0].id));
      } else {
        await db.insert(hostAnalyticsSnapshots).values({
          hostUserId,
          snapshotDate: snapshotDate as any,
          ...payload,
        } as any);
      }
    }
  }

  @Cron("0 1 * * *")
  async runNightlyCreatorSnapshots() {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const snapshotDate = yesterday.toISOString().slice(0, 10);
    await this.aggregateCreatorSnapshots(snapshotDate);
  }
}
