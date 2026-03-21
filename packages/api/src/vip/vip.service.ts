import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { db } from "@missu/db";
import { users, vipSubscriptions, vipTiers } from "@missu/db/schema";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { generateIdempotencyKey } from "@missu/utils";
import { WalletService } from "../wallet/wallet.service";
import { IdempotencyService } from "../common/idempotency.service";

type DbClient = any;

type VipPackageInput = {
  tierCode?: string;
  name: string;
  price: number;
  coinPrice: number;
  durationDays: number;
  benefits: Record<string, unknown>;
  isActive?: boolean;
  displayOrder?: number;
};

@Injectable()
export class VipService {
  constructor(
    private readonly walletService: WalletService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  private buildTierCode(value: string) {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "VIP";
  }

  private mapTier(tier: typeof vipTiers.$inferSelect) {
    const benefits = (tier.perkJson as Record<string, unknown> | null) ?? {};
    const durationDays = Number(benefits.durationDays ?? 30);

    return {
      id: tier.id,
      tierCode: tier.tierCode,
      name: tier.displayName,
      price: Number(tier.monthlyPriceUsd),
      priceCoins: tier.coinPrice ?? 0,
      durationDays,
      benefits,
      isActive: tier.isActive,
      displayOrder: tier.displayOrder,
      deletedAt: tier.deletedAt,
      createdAt: tier.createdAt,
      updatedAt: tier.updatedAt,
    };
  }

  private async getTierByCode(tierCode: string, dbClient: DbClient = db, includeInactive = false) {
    const conditions = [eq(vipTiers.tierCode, tierCode), isNull(vipTiers.deletedAt)];
    if (!includeInactive) {
      conditions.push(eq(vipTiers.isActive, true));
    }

    const [tier] = await dbClient
      .select()
      .from(vipTiers)
      .where(and(...conditions))
      .limit(1);

    return tier ?? null;
  }

  private async getTierById(packageId: string, dbClient: DbClient = db) {
    const [tier] = await dbClient
      .select()
      .from(vipTiers)
      .where(and(eq(vipTiers.id, packageId), isNull(vipTiers.deletedAt)))
      .limit(1);

    return tier ?? null;
  }

  private async syncUserVipState(userId: string, dbClient: DbClient = db) {
    const [activeSubscription] = await dbClient
      .select()
      .from(vipSubscriptions)
      .where(and(
        eq(vipSubscriptions.userId, userId),
        eq(vipSubscriptions.status, "ACTIVE" as any),
        gt(vipSubscriptions.currentPeriodEnd, new Date()),
      ))
      .orderBy(desc(vipSubscriptions.currentPeriodEnd))
      .limit(1);

    await dbClient
      .update(users)
      .set({
        vipType: activeSubscription?.tier ?? null,
        vipExpiry: activeSubscription?.currentPeriodEnd ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async listPackages() {
    const tiers = await db
      .select()
      .from(vipTiers)
      .where(isNull(vipTiers.deletedAt))
      .orderBy(vipTiers.displayOrder, vipTiers.displayName);

    return tiers.map((tier) => this.mapTier(tier));
  }

  async getAvailableTiers() {
    const tiers = await db
      .select()
      .from(vipTiers)
      .where(and(eq(vipTiers.isActive, true), isNull(vipTiers.deletedAt)))
      .orderBy(vipTiers.displayOrder);

    return tiers.map((tier) => this.mapTier(tier));
  }

  async createPackage(input: VipPackageInput, adminUserId: string) {
    if (!Number.isFinite(input.price) || input.price < 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "VIP package price must be non-negative" });
    }

    if (!Number.isInteger(input.coinPrice) || input.coinPrice < 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "VIP package coin price must be a non-negative integer" });
    }

    if (!Number.isInteger(input.durationDays) || input.durationDays <= 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "VIP duration must be a positive integer" });
    }

    const tierCode = this.buildTierCode(input.tierCode ?? input.name);

    // Check if tierCode already exists — if so, update instead of fail
    const existing = await this.getTierByCode(tierCode, db, true);
    if (existing) {
      const [updated] = await db
        .update(vipTiers)
        .set({
          displayName: input.name,
          monthlyPriceUsd: input.price.toFixed(2),
          coinPrice: input.coinPrice,
          perkJson: { ...((existing.perkJson as Record<string, unknown>) ?? {}), ...input.benefits, durationDays: input.durationDays },
          isActive: input.isActive ?? existing.isActive,
          displayOrder: input.displayOrder ?? existing.displayOrder,
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(vipTiers.id, existing.id))
        .returning();
      return this.mapTier(updated!);
    }

    const [created] = await db
      .insert(vipTiers)
      .values({
        tierCode,
        displayName: input.name,
        monthlyPriceUsd: input.price.toFixed(2),
        coinPrice: input.coinPrice,
        perkJson: {
          ...input.benefits,
          durationDays: input.durationDays,
        },
        isActive: input.isActive ?? true,
        displayOrder: input.displayOrder ?? 0,
        createdByAdminId: adminUserId,
      })
      .returning();

    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create VIP package" });
    }

    return this.mapTier(created);
  }

  async updatePackage(packageId: string, input: Partial<VipPackageInput>) {
    const existing = await this.getTierById(packageId);
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "VIP package not found" });
    }

    const existingBenefits = (existing.perkJson as Record<string, unknown> | null) ?? {};
    const nextBenefits = input.benefits
      ? { ...existingBenefits, ...input.benefits }
      : existingBenefits;

    if (input.durationDays !== undefined) {
      if (!Number.isInteger(input.durationDays) || input.durationDays <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "VIP duration must be a positive integer" });
      }
      nextBenefits.durationDays = input.durationDays;
    }

    const [updated] = await db
      .update(vipTiers)
      .set({
        tierCode: input.tierCode ? this.buildTierCode(input.tierCode) : existing.tierCode,
        displayName: input.name ?? existing.displayName,
        monthlyPriceUsd: input.price === undefined ? existing.monthlyPriceUsd : input.price.toFixed(2),
        coinPrice: input.coinPrice ?? existing.coinPrice,
        perkJson: nextBenefits,
        isActive: input.isActive ?? existing.isActive,
        displayOrder: input.displayOrder ?? existing.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(vipTiers.id, packageId))
      .returning();

    if (!updated) {
      throw new TRPCError({ code: "CONFLICT", message: "Unable to update VIP package" });
    }

    return this.mapTier(updated);
  }

  async subscribe(userId: string, tierCode: string) {
    const idemKey = generateIdempotencyKey(userId, "vip_purchase", tierCode);

    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "vip:purchase",
        actorUserId: userId,
        requestData: { tierCode },
      },
      async () => {
        const tier = await this.getTierByCode(tierCode);
        if (!tier) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid VIP package" });
        }

        const packageDetails = this.mapTier(tier);

        const result = await db.transaction(async (tx) => {
          const [activeSubscription] = await tx
            .select()
            .from(vipSubscriptions)
            .where(and(eq(vipSubscriptions.userId, userId), eq(vipSubscriptions.status, "ACTIVE" as any)))
            .orderBy(desc(vipSubscriptions.currentPeriodEnd))
            .limit(1);

          if ((tier.coinPrice ?? 0) > 0) {
            await this.walletService.applyCoinMutation(tx, {
              userId,
              amount: -(tier.coinPrice ?? 0),
              transactionType: "PURCHASE",
              referenceType: "VIP",
              referenceId: tier.id,
              description: `VIP purchase: ${tier.displayName}`,
              idempotencyKey: idemKey,
            });
          }

          const now = new Date();
          const baseEnd = activeSubscription && activeSubscription.currentPeriodEnd > now
            ? new Date(activeSubscription.currentPeriodEnd)
            : new Date(now);
          const nextEnd = new Date(baseEnd);
          nextEnd.setDate(nextEnd.getDate() + packageDetails.durationDays);

          const [subscription] = activeSubscription
            ? await tx
                .update(vipSubscriptions)
                .set({
                  tier: tier.tierCode,
                  status: "ACTIVE" as any,
                  currentPeriodEnd: nextEnd,
                  cancelledAt: null,
                })
                .where(eq(vipSubscriptions.id, activeSubscription.id))
                .returning()
            : await tx
                .insert(vipSubscriptions)
                .values({
                  userId,
                  tier: tier.tierCode,
                  status: "ACTIVE" as any,
                  currentPeriodStart: now,
                  currentPeriodEnd: nextEnd,
                })
                .returning();

          await this.syncUserVipState(userId, tx);
          return subscription ?? null;
        });

        return result ? { ...result, tierDetails: packageDetails } : null;
      },
    );
  }

  async grantVip(userId: string, tierCode: string, adminUserId: string, durationDays?: number) {
    const tier = await this.getTierByCode(tierCode, db, true);
    if (!tier) {
      throw new TRPCError({ code: "NOT_FOUND", message: "VIP package not found" });
    }

    const packageDetails = this.mapTier(tier);
    const effectiveDuration = durationDays ?? packageDetails.durationDays;

    if (!Number.isInteger(effectiveDuration) || effectiveDuration <= 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Grant duration must be a positive integer" });
    }

    const subscription = await db.transaction(async (tx) => {
      const [activeSubscription] = await tx
        .select()
        .from(vipSubscriptions)
        .where(and(eq(vipSubscriptions.userId, userId), eq(vipSubscriptions.status, "ACTIVE" as any)))
        .orderBy(desc(vipSubscriptions.currentPeriodEnd))
        .limit(1);

      const now = new Date();
      const baseEnd = activeSubscription && activeSubscription.currentPeriodEnd > now
        ? new Date(activeSubscription.currentPeriodEnd)
        : new Date(now);
      const nextEnd = new Date(baseEnd);
      nextEnd.setDate(nextEnd.getDate() + effectiveDuration);

      const [updated] = activeSubscription
        ? await tx
            .update(vipSubscriptions)
            .set({
              tier: tier.tierCode,
              status: "ACTIVE" as any,
              currentPeriodEnd: nextEnd,
              cancelledAt: null,
            })
            .where(eq(vipSubscriptions.id, activeSubscription.id))
            .returning()
        : await tx
            .insert(vipSubscriptions)
            .values({
              userId,
              tier: tier.tierCode,
              status: "ACTIVE" as any,
              currentPeriodStart: now,
              currentPeriodEnd: nextEnd,
              stripeSubscriptionId: `admin:${adminUserId}`,
            })
            .returning();

      await this.syncUserVipState(userId, tx);
      return updated ?? null;
    });

    return subscription ? { ...subscription, tierDetails: { ...packageDetails, durationDays: effectiveDuration } } : null;
  }

  async cancelSubscription(userId: string) {
    const [subscription] = await db
      .select()
      .from(vipSubscriptions)
      .where(and(eq(vipSubscriptions.userId, userId), eq(vipSubscriptions.status, "ACTIVE" as any)))
      .limit(1);

    if (!subscription) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active VIP subscription found" });
    }

    const [updated] = await db
      .update(vipSubscriptions)
      .set({ status: "CANCELLED" as any, cancelledAt: new Date() })
      .where(eq(vipSubscriptions.id, subscription.id))
      .returning();

    await this.syncUserVipState(userId);
    return updated ?? null;
  }

  async getMySubscription(userId: string) {
    const [subscription] = await db
      .select()
      .from(vipSubscriptions)
      .where(eq(vipSubscriptions.userId, userId))
      .orderBy(desc(vipSubscriptions.currentPeriodEnd))
      .limit(1);

    if (!subscription) {
      return null;
    }

    const tier = await this.getTierByCode(subscription.tier, db, true);
    return { ...subscription, tierDetails: tier ? this.mapTier(tier) : null };
  }
}
