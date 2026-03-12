import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  analyticsEvents, users, callSessions, chatSessions, payments,
  giftTransactions, liveStreams, coinTransactions,
  diamondTransactions, models, modelCallStats,
} from "@missu/db/schema";
import { eq, and, desc, sql, count, sum, between } from "drizzle-orm";

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
}
