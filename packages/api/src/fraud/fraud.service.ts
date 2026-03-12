import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { fraudSignals, fraudFlags, coinTransactions, users } from "@missu/db/schema";
import { eq, and, desc, sql, gte, count } from "drizzle-orm";

@Injectable()
export class FraudService {
  async scoreTransactionRisk(userId: string, amount: number, transactionType: string): Promise<{ score: number; signals: string[]; action: "allow" | "review" | "block" }> {
    const signals: string[] = [];
    let score = 0;

    const recentTxCount = await db
      .select({ count: count() })
      .from(coinTransactions)
      .where(and(eq(coinTransactions.userId, userId), gte(coinTransactions.createdAt, new Date(Date.now() - 3600_000))));

    const txCount = Number(recentTxCount[0]?.count ?? 0);
    if (txCount > 20) { score += 30; signals.push("high_velocity"); }
    else if (txCount > 10) { score += 15; signals.push("elevated_velocity"); }

    const avgAmount = await db
      .select({ avg: sql<number>`avg(abs(${coinTransactions.amount}))` })
      .from(coinTransactions)
      .where(eq(coinTransactions.userId, userId));

    const avg = Number(avgAmount[0]?.avg ?? 0);
    if (avg > 0 && amount > avg * 5) { score += 25; signals.push("amount_anomaly"); }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user) {
      const ageMs = Date.now() - new Date(user.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 1) { score += 20; signals.push("new_account"); }
      else if (ageDays < 7) { score += 10; signals.push("young_account"); }
    }

    const existingFlags = await db
      .select({ count: count() })
      .from(fraudFlags)
      .where(and(eq(fraudFlags.entityId, userId), eq(fraudFlags.status, "OPEN" as any)));

    if (Number(existingFlags[0]?.count ?? 0) > 0) {
      score += 20;
      signals.push("existing_fraud_flags");
    }

    await db.insert(fraudSignals).values({
      entityType: "USER" as any,
      entityId: userId,
      signalType: transactionType as any,
      signalValue: String(score / 100),
      weight: "1.0",
      detailsJson: { amount, signals, transactionType },
    });

    let action: "allow" | "review" | "block" = "allow";
    if (score >= 70) action = "block";
    else if (score >= 40) action = "review";

    if (action !== "allow") {
      await db.insert(fraudFlags).values({
        entityType: "TRANSACTION" as any,
        entityId: userId,
        riskScore: score,
        riskLevel: (action === "block" ? "CRITICAL" : "HIGH") as any,
        signalsJson: { score, signals, amount, transactionType },
        status: "OPEN" as any,
      });
    }

    return { score, signals, action };
  }

  async getFraudDashboard() {
    const pendingFlags = await db.select({ count: count() }).from(fraudFlags).where(eq(fraudFlags.status, "OPEN" as any));
    const recentSignals = await db
      .select()
      .from(fraudSignals)
      .orderBy(desc(fraudSignals.createdAt))
      .limit(50);

    const highRiskUsers = await db
      .select({
        entityId: fraudSignals.entityId,
        avgScore: sql<number>`avg(CAST(${fraudSignals.signalValue} AS numeric))`,
        signalCount: count(),
      })
      .from(fraudSignals)
      .where(sql`CAST(${fraudSignals.signalValue} AS numeric) >= 0.4`)
      .groupBy(fraudSignals.entityId)
      .orderBy(desc(sql`avg(CAST(${fraudSignals.signalValue} AS numeric))`))
      .limit(20);

    return {
      pendingFlags: Number(pendingFlags[0]?.count ?? 0),
      recentSignals,
      highRiskUsers,
    };
  }
}
