import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { vipSubscriptions, vipTiers } from "@missu/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateIdempotencyKey } from "@missu/utils";
import { WalletService } from "../wallet/wallet.service";
import { IdempotencyService } from "../common/idempotency.service";

@Injectable()
export class VipService {
  constructor(
    private readonly walletService: WalletService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  private mapTier(tier: typeof vipTiers.$inferSelect) {
    const perks = (tier.perkJson as { perks?: string[]; durationDays?: number } | null) ?? {};

    return {
      id: tier.tierCode,
      tierId: tier.id,
      name: tier.displayName,
      price: tier.coinPrice ?? 0,
      priceCoins: tier.coinPrice ?? 0,
      priceUsd: tier.monthlyPriceUsd,
      durationDays: perks.durationDays ?? 30,
      duration: `${perks.durationDays ?? 30} days`,
      perks: perks.perks ?? [],
    };
  }

  private async getTierByCode(tierCode: string) {
    const [tier] = await db
      .select()
      .from(vipTiers)
      .where(and(eq(vipTiers.tierCode, tierCode), eq(vipTiers.isActive, true)))
      .limit(1);

    return tier ?? null;
  }

  async getAvailableTiers() {
    const tiers = await db.select().from(vipTiers).where(eq(vipTiers.isActive, true)).orderBy(vipTiers.displayOrder);
    return tiers.map((tier) => this.mapTier(tier));
  }

  async subscribe(userId: string, tierId: string) {
    const tier = await this.getTierByCode(tierId);
    if (!tier) throw new Error("Invalid VIP tier");

    const existing = await db
      .select()
      .from(vipSubscriptions)
      .where(and(eq(vipSubscriptions.userId, userId), eq(vipSubscriptions.status, "ACTIVE" as any)))
      .limit(1);

    if (existing[0]) throw new Error("Already have an active VIP subscription");

    const mappedTier = this.mapTier(tier);
    const idemKey = generateIdempotencyKey(userId, "vip_sub", tierId);

    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "vip:subscribe",
        actorUserId: userId,
        requestData: { tierId },
      },
      async () => {
        if (mappedTier.priceCoins > 0) {
          await this.walletService.debitCoins(
            userId,
            mappedTier.priceCoins,
            "CALL_BILLING",
            tier.id,
            `VIP ${tierId} subscription`,
            idemKey,
          );
        }

        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + mappedTier.durationDays);

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

        return { ...subscription, tierDetails: mappedTier };
      },
    );
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

    const tier = await this.getTierByCode(sub.tier);
    return { ...sub, tierDetails: tier ? this.mapTier(tier) : null };
  }
}
