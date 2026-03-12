import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { vipSubscriptions, wallets, coinTransactions } from "@missu/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";
import { acquireLock, releaseLock, generateIdempotencyKey } from "@missu/utils";

@Injectable()
export class VipService {
  async getAvailableTiers() {
    return Object.entries(DEFAULTS.VIP_TIERS).map(([key, tier]) => ({
      id: key,
      ...(tier as Record<string, any>),
    }));
  }

  async subscribe(userId: string, tierId: string) {
    const tier = (DEFAULTS.VIP_TIERS as any)[tierId];
    if (!tier) throw new Error("Invalid VIP tier");

    const existing = await db
      .select()
      .from(vipSubscriptions)
      .where(and(eq(vipSubscriptions.userId, userId), eq(vipSubscriptions.status, "ACTIVE" as any)))
      .limit(1);

    if (existing[0]) throw new Error("Already have an active VIP subscription");

    const lock = await acquireLock(`wallet:${userId}`, 10000);
    if (!lock) throw new Error("Could not acquire wallet lock");

    try {
      const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
      if (!wallet || wallet.coinBalance < tier.coinPrice) throw new Error("Insufficient coins");

      await db.update(wallets).set({
        coinBalance: wallet.coinBalance - tier.coinPrice,
        lifetimeCoinsSpent: wallet.lifetimeCoinsSpent + tier.coinPrice,
        updatedAt: new Date(),
      }).where(eq(wallets.id, wallet.id));

      await db.insert(coinTransactions).values({
        userId,
        amount: -tier.coinPrice,
        transactionType: "CALL_BILLING" as any,
        description: `VIP ${tierId} subscription`,
        balanceAfter: wallet.coinBalance - tier.coinPrice,
        idempotencyKey: generateIdempotencyKey(userId, "vip_sub", tierId),
      });

      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + tier.durationDays);

      const [subscription] = await db
        .insert(vipSubscriptions)
        .values({
          userId,
          tier: tierId,
          status: "ACTIVE" as any,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        })
        .returning();

      return subscription;
    } finally {
      await releaseLock(`wallet:${userId}`, lock);
    }
  }

  async cancelSubscription(userId: string) {
    const [sub] = await db
      .select()
      .from(vipSubscriptions)
      .where(and(eq(vipSubscriptions.userId, userId), eq(vipSubscriptions.status, "ACTIVE" as any)))
      .limit(1);

    if (!sub) throw new Error("No active subscription found");

    const [updated] = await db
      .update(vipSubscriptions)
      .set({ status: "CANCELLED" as any, cancelledAt: new Date() })
      .where(eq(vipSubscriptions.id, sub.id))
      .returning();

    return updated;
  }

  async getMySubscription(userId: string) {
    const [sub] = await db
      .select()
      .from(vipSubscriptions)
      .where(eq(vipSubscriptions.userId, userId))
      .orderBy(desc(vipSubscriptions.currentPeriodEnd))
      .limit(1);

    if (!sub) return null;

    const tier = (DEFAULTS.VIP_TIERS as any)[sub.tier];
    return { ...sub, tierDetails: tier ?? null };
  }
}
