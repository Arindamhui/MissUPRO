import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { referrals, referralRewards, wallets, coinTransactions } from "@missu/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";
import { generateIdempotencyKey } from "@missu/utils";
import { createHash } from "node:crypto";

@Injectable()
export class ReferralService {
  async generateInviteCode(userId: string) {
    const [existing] = await db.select().from(referrals).where(eq(referrals.inviterUserId, userId)).limit(1);
    if (existing?.referralCode) return { inviteCode: existing.referralCode };

    const code = createHash("sha256").update(userId).digest("hex").substring(0, 8).toUpperCase();
    return { inviteCode: code };
  }

  async applyReferralCode(userId: string, inviteCode: string) {
    const allReferrals = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referralCode, inviteCode))
      .limit(1);

    let referrerId: string;

    if (allReferrals[0]) {
      referrerId = allReferrals[0].inviterUserId;
    } else {
      throw new Error("Invalid referral code");
    }

    if (referrerId === userId) throw new Error("Cannot refer yourself");

    const existingRef = await db.select().from(referrals).where(eq(referrals.inviteeUserId, userId)).limit(1);
    if (existingRef[0]) throw new Error("Already used a referral code");

    const [referral] = await db
      .insert(referrals)
      .values({
        inviterUserId: referrerId,
        inviteeUserId: userId,
        referralCode: inviteCode,
        attributionSource: "DIRECT",
        status: "PENDING" as any,
      })
      .returning();

    if (!referral) throw new Error("Failed to create referral");

    const referrerRewardCoins = DEFAULTS.REFERRAL_TIERS[0]?.referrerReward ?? 100;
    const referredRewardCoins = DEFAULTS.REFERRAL_TIERS[0]?.referredReward ?? 50;

    await this.grantReferralReward(referrerId, referrerRewardCoins, referral.id, "COINS");
    await this.grantReferralReward(userId, referredRewardCoins, referral.id, "COINS");

    await db.update(referrals).set({ status: "QUALIFIED" as any, qualifiedAt: new Date() }).where(eq(referrals.id, referral.id));

    return { success: true, referral };
  }

  async getReferralProgress(userId: string) {
    const referralsMade = await db
      .select({ count: count() })
      .from(referrals)
      .where(eq(referrals.inviterUserId, userId));

    const completedReferrals = await db
      .select({ count: count() })
      .from(referrals)
      .where(and(eq(referrals.inviterUserId, userId), eq(referrals.status, "REWARDED" as any)));

    const rewards = await db
      .select()
      .from(referralRewards)
      .where(eq(referralRewards.inviterUserId, userId))
      .orderBy(desc(referralRewards.createdAt));

    const inviteCode = createHash("sha256").update(userId).digest("hex").substring(0, 8).toUpperCase();

    return {
      inviteCode,
      totalReferrals: Number(referralsMade[0]?.count ?? 0),
      completedReferrals: Number(completedReferrals[0]?.count ?? 0),
      rewards,
    };
  }

  private async grantReferralReward(userId: string, coinAmount: number, referralId: string, rewardType: string) {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    if (!wallet) return;

    await db.update(wallets).set({ coinBalance: wallet.coinBalance + coinAmount, updatedAt: new Date() }).where(eq(wallets.id, wallet.id));
    await db.insert(coinTransactions).values({
      userId,
      amount: coinAmount,
      transactionType: "REFERRAL_REWARD" as any,
      description: `Referral reward`,
      balanceAfter: wallet.coinBalance + coinAmount,
      idempotencyKey: generateIdempotencyKey(userId, "referral_reward", referralId),
    });
    await db.insert(referralRewards).values({
      inviterUserId: userId,
      referralId,
      rewardType: rewardType as any,
      rewardValueJson: { coins: coinAmount },
      status: "APPROVED" as any,
    });
  }
}
