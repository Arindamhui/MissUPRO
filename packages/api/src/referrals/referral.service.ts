import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { db } from "@missu/db";
import {
  payments,
  referralRewards,
  referralRules,
  referrals,
  users,
  fraudSignals,
  fraudFlags,
} from "@missu/db/schema";
import { and, count, desc, eq, inArray, or } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";
import { generateIdempotencyKey } from "@missu/utils";
import { createHash } from "node:crypto";
import { WalletService } from "../wallet/wallet.service";

type ReferralRewardConfig = {
  type: "COINS" | "BADGE" | "VIP_DAYS";
  coins?: number;
  badgeCode?: string;
  vipDays?: number;
};

type ReferralRuleConfig = {
  qualification: {
    minFirstPurchaseUsd: number;
    requiredCompletedPayments: number;
  };
  inviterReward: ReferralRewardConfig;
  inviteeReward: ReferralRewardConfig | null;
  antiFraud: {
    reviewThreshold: number;
    rejectThreshold: number;
  };
};

@Injectable()
export class ReferralService {
  constructor(private readonly walletService: WalletService) {}

  private normalizeInviteCode(code: string) {
    return code.trim().toUpperCase();
  }

  private buildFallbackInviteCode(userId: string) {
    return createHash("sha256").update(userId).digest("hex").slice(0, 8).toUpperCase();
  }

  private asObject(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private toPositiveNumber(value: unknown, fallback: number) {
    const numberValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
  }

  private toRewardConfig(value: unknown, fallbackCoins = 0): ReferralRewardConfig | null {
    if (value == null) {
      return fallbackCoins > 0 ? { type: "COINS", coins: fallbackCoins } : null;
    }

    if (typeof value === "number") {
      return { type: "COINS", coins: Math.max(0, Math.round(value)) };
    }

    const reward = this.asObject(value);
    const type = String(reward.type ?? reward.rewardType ?? "COINS").toUpperCase();

    if (type === "BADGE") {
      return { type: "BADGE", badgeCode: String(reward.badgeCode ?? reward.badge ?? "referral-badge") };
    }

    if (type === "VIP_DAYS") {
      return { type: "VIP_DAYS", vipDays: Math.max(1, Math.round(Number(reward.vipDays ?? reward.days ?? 1))) };
    }

    return { type: "COINS", coins: Math.max(0, Math.round(Number(reward.coins ?? reward.amount ?? fallbackCoins))) };
  }

  private async ensureInviteCode(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    if (user.referralCode?.trim()) {
      return user;
    }

    const referralCode = this.buildFallbackInviteCode(userId);
    const [updated] = await db
      .update(users)
      .set({ referralCode, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return updated ?? { ...user, referralCode };
  }

  private async getActiveRule(): Promise<ReferralRuleConfig> {
    const [rule] = await db
      .select()
      .from(referralRules)
      .where(eq(referralRules.isActive, true))
      .orderBy(desc(referralRules.effectiveFrom))
      .limit(1);

    const defaultTier = DEFAULTS.REFERRAL_TIERS[0] ?? { referrerReward: 100, referredReward: 50 };

    if (!rule) {
      return {
        qualification: {
          minFirstPurchaseUsd: 0,
          requiredCompletedPayments: 1,
        },
        inviterReward: { type: "COINS", coins: defaultTier.referrerReward ?? 100 },
        inviteeReward: { type: "COINS", coins: defaultTier.referredReward ?? 50 },
        antiFraud: {
          reviewThreshold: 40,
          rejectThreshold: 70,
        },
      };
    }

    const qualification = this.asObject(rule.qualificationJson);
    const antiFraud = this.asObject(rule.antiFraudJson);

    return {
      qualification: {
        minFirstPurchaseUsd: this.toPositiveNumber(qualification.minFirstPurchaseUsd, 0),
        requiredCompletedPayments: Math.max(1, Math.round(this.toPositiveNumber(qualification.requiredCompletedPayments, 1))),
      },
      inviterReward: this.toRewardConfig(rule.inviterRewardJson, defaultTier.referrerReward ?? 100)
        ?? { type: "COINS", coins: defaultTier.referrerReward ?? 100 },
      inviteeReward: this.toRewardConfig(rule.inviteeRewardJson, defaultTier.referredReward ?? 50),
      antiFraud: {
        reviewThreshold: Math.min(100, Math.max(0, Math.round(this.toPositiveNumber(antiFraud.reviewThreshold, 40)))),
        rejectThreshold: Math.min(100, Math.max(0, Math.round(this.toPositiveNumber(antiFraud.rejectThreshold, 70)))),
      },
    };
  }

  private async getCompletedPayments(userId: string) {
    return db
      .select()
      .from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.status, "COMPLETED" as any)))
      .orderBy(payments.createdAt);
  }

  private async evaluateReferralRisk(referralId: string, inviterUserId: string, inviteeUserId: string) {
    let score = 0;
    const signals = new Set<string>();
    const details: Record<string, unknown> = {};

    const [inviter, invitee, inviterPayments, inviteePayments, openFlags] = await Promise.all([
      db.select().from(users).where(eq(users.id, inviterUserId)).limit(1),
      db.select().from(users).where(eq(users.id, inviteeUserId)).limit(1),
      this.getCompletedPayments(inviterUserId),
      this.getCompletedPayments(inviteeUserId),
      db
        .select({ count: count() })
        .from(fraudFlags)
        .where(
          and(
            eq(fraudFlags.status, "OPEN" as any),
            or(
              eq(fraudFlags.entityId, inviterUserId),
              eq(fraudFlags.entityId, inviteeUserId),
              eq(fraudFlags.entityId, referralId),
            ),
          ),
        ),
    ]);

    const inviterRecord = inviter[0];
    const inviteeRecord = invitee[0];

    if (!inviterRecord || !inviteeRecord) {
      return { score: 100, signals: ["INVALID_REFERRAL_STATE"], details: { inviterUserId, inviteeUserId } };
    }

    if (inviterRecord.id === inviteeRecord.id) {
      score += 100;
      signals.add("SELF_REFERRAL");
    }

    if (inviteeRecord.referredByUserId && inviteeRecord.referredByUserId !== inviterRecord.id) {
      score += 100;
      signals.add("MULTI_ATTRIBUTION");
    }

    const inviteeAgeHours = (Date.now() - new Date(inviteeRecord.createdAt).getTime()) / 3_600_000;
    if (inviteeAgeHours < 6) {
      score += 15;
      signals.add("NEW_ACCOUNT");
      details.inviteeAgeHours = inviteeAgeHours;
    }

    const inviterKeys = new Set(
      inviterPayments
        .flatMap((payment) => {
          const metadata = this.asObject(payment.metadataJson);
          return [
            metadata.paymentMethodFingerprint,
            metadata.cardFingerprint,
            metadata.billingEmail,
          ];
        })
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    );

    const overlappingPaymentKey = inviteePayments
      .flatMap((payment) => {
        const metadata = this.asObject(payment.metadataJson);
        return [
          metadata.paymentMethodFingerprint,
          metadata.cardFingerprint,
          metadata.billingEmail,
        ];
      })
      .find((value): value is string => typeof value === "string" && inviterKeys.has(value));

    if (overlappingPaymentKey) {
      score += 70;
      signals.add("PAYMENT_INSTRUMENT_OVERLAP");
      details.overlappingPaymentKey = overlappingPaymentKey;
    }

    if (Number(openFlags[0]?.count ?? 0) > 0) {
      score += 25;
      signals.add("EXISTING_FRAUD_FLAGS");
    }

    return {
      score: Math.min(100, score),
      signals: Array.from(signals),
      details,
    };
  }

  private async persistFraudSignals(
    referralId: string,
    inviterUserId: string,
    inviteeUserId: string,
    risk: { score: number; signals: string[]; details: Record<string, unknown> },
  ) {
    if (risk.signals.length === 0) {
      return null;
    }

    const [existingFlag] = await db
      .select()
      .from(fraudFlags)
      .where(and(eq(fraudFlags.entityType, "REFERRAL" as any), eq(fraudFlags.entityId, referralId)))
      .limit(1);

    let fraudFlagId = existingFlag?.id ?? null;

    if (!fraudFlagId) {
      const [createdFlag] = await db
        .insert(fraudFlags)
        .values({
          entityType: "REFERRAL" as any,
          entityId: referralId,
          riskScore: risk.score,
          riskLevel: risk.score >= 70 ? "CRITICAL" as any : "HIGH" as any,
          signalsJson: {
            inviterUserId,
            inviteeUserId,
            signals: risk.signals,
            ...risk.details,
          },
          status: "OPEN" as any,
        })
        .returning();

      fraudFlagId = createdFlag?.id ?? null;
    }

    const knownSignals = new Set(
      (await db
        .select({ signalType: fraudSignals.signalType })
        .from(fraudSignals)
        .where(and(eq(fraudSignals.entityType, "REFERRAL" as any), eq(fraudSignals.entityId, referralId))))
        .map((signal) => String(signal.signalType)),
    );

    const signalTypeMap: Record<string, string> = {
      SELF_REFERRAL: "SELF_REFERRAL",
      PAYMENT_INSTRUMENT_OVERLAP: "PAYMENT_INSTRUMENT_OVERLAP",
      NEW_ACCOUNT: "BEHAVIOR_ANOMALY",
      MULTI_ATTRIBUTION: "SCRIPTED_PATTERN",
      EXISTING_FRAUD_FLAGS: "BEHAVIOR_ANOMALY",
      INVALID_REFERRAL_STATE: "SCRIPTED_PATTERN",
    };

    for (const signal of risk.signals) {
      const mappedType = signalTypeMap[signal] ?? "BEHAVIOR_ANOMALY";
      const dedupeKey = `${signal}:${mappedType}`;
      if (knownSignals.has(mappedType) || knownSignals.has(dedupeKey)) {
        continue;
      }

      await db.insert(fraudSignals).values({
        entityType: "REFERRAL" as any,
        entityId: referralId,
        signalType: mappedType as any,
        signalValue: String(Math.max(0.01, Math.min(1, risk.score / 100))),
        weight: "1.0000",
        detailsJson: {
          rawSignal: signal,
          inviterUserId,
          inviteeUserId,
          ...risk.details,
        },
        fraudFlagId,
      });
      knownSignals.add(mappedType);
      knownSignals.add(dedupeKey);
    }

    return fraudFlagId;
  }

  private async approveReward(
    referralId: string,
    rewardedUserId: string,
    beneficiaryRole: "INVITER" | "INVITEE",
    reward: ReferralRewardConfig | null,
  ) {
    if (!reward) {
      return null;
    }

    const [existing] = await db
      .select()
      .from(referralRewards)
      .where(and(eq(referralRewards.referralId, referralId), eq(referralRewards.inviterUserId, rewardedUserId)))
      .limit(1);

    if (existing?.status === "APPROVED") {
      return existing;
    }

    const rewardValueJson = {
      ...reward,
      beneficiaryRole,
    };

    if (reward.type === "COINS" && (reward.coins ?? 0) > 0) {
      await this.walletService.creditCoins(
        rewardedUserId,
        reward.coins ?? 0,
        "REFERRAL_REWARD",
        referralId,
        `Referral reward (${beneficiaryRole.toLowerCase()})`,
        generateIdempotencyKey(rewardedUserId, `referral_reward_${beneficiaryRole.toLowerCase()}`, referralId),
      );
    }

    if (existing) {
      const [updated] = await db
        .update(referralRewards)
        .set({
          rewardType: reward.type as any,
          rewardValueJson,
          status: "APPROVED" as any,
          approvedAt: new Date(),
        })
        .where(eq(referralRewards.id, existing.id))
        .returning();
      return updated ?? existing;
    }

    const [created] = await db
      .insert(referralRewards)
      .values({
        referralId,
        inviterUserId: rewardedUserId,
        rewardType: reward.type as any,
        rewardValueJson,
        status: "APPROVED" as any,
        approvedAt: new Date(),
      })
      .returning();

    return created ?? null;
  }

  private async refreshReferralQualification(referralId: string) {
    const [referral] = await db.select().from(referrals).where(eq(referrals.id, referralId)).limit(1);
    if (!referral || referral.status === "REJECTED" || referral.status === "REWARDED") {
      return referral;
    }

    const rule = await this.getActiveRule();
    const completedPayments = await this.getCompletedPayments(referral.inviteeUserId);
    const totalCompletedPayments = completedPayments.length;
    const firstCompletedPayment = completedPayments[0];
    const firstPurchaseUsd = Number(firstCompletedPayment?.amountUsd ?? 0);

    const qualifies = totalCompletedPayments >= rule.qualification.requiredCompletedPayments
      && firstPurchaseUsd >= rule.qualification.minFirstPurchaseUsd;

    if (!qualifies) {
      return referral;
    }

    const risk = await this.evaluateReferralRisk(referral.id, referral.inviterUserId, referral.inviteeUserId);

    if (risk.signals.length > 0) {
      await this.persistFraudSignals(referral.id, referral.inviterUserId, referral.inviteeUserId, risk);
    }

    if (risk.score >= rule.antiFraud.rejectThreshold) {
      const [rejected] = await db
        .update(referrals)
        .set({ status: "REJECTED" as any })
        .where(eq(referrals.id, referral.id))
        .returning();
      return rejected ?? referral;
    }

    const now = new Date();
    const nextStatus = risk.score >= rule.antiFraud.reviewThreshold ? "QUALIFIED" : "REWARDED";

    const [qualified] = await db
      .update(referrals)
      .set({
        status: nextStatus as any,
        qualifiedAt: referral.qualifiedAt ?? now,
      })
      .where(eq(referrals.id, referral.id))
      .returning();

    if (risk.score >= rule.antiFraud.reviewThreshold) {
      return qualified ?? referral;
    }

    await this.approveReward(referral.id, referral.inviterUserId, "INVITER", rule.inviterReward);
    await this.approveReward(referral.id, referral.inviteeUserId, "INVITEE", rule.inviteeReward);

    const [rewarded] = await db
      .update(referrals)
      .set({ status: "REWARDED" as any, qualifiedAt: referral.qualifiedAt ?? now })
      .where(eq(referrals.id, referral.id))
      .returning();

    return rewarded ?? qualified ?? referral;
  }

  private async refreshOutstandingReferralsForUser(userId: string) {
    const pending = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(
        and(
          or(eq(referrals.inviterUserId, userId), eq(referrals.inviteeUserId, userId)),
          inArray(referrals.status, ["PENDING", "QUALIFIED"] as any),
        ),
      )
      .orderBy(desc(referrals.createdAt))
      .limit(50);

    for (const referral of pending) {
      await this.refreshReferralQualification(referral.id);
    }
  }

  async generateInviteCode(userId: string) {
    const user = await this.ensureInviteCode(userId);
    return { inviteCode: user.referralCode };
  }

  async applyReferralCode(userId: string, inviteCode: string) {
    const normalizedCode = this.normalizeInviteCode(inviteCode);
    const [invitee, inviter, existingReferral] = await Promise.all([
      this.ensureInviteCode(userId),
      db.select().from(users).where(eq(users.referralCode, normalizedCode)).limit(1),
      db.select().from(referrals).where(eq(referrals.inviteeUserId, userId)).limit(1),
    ]);

    const inviterRecord = inviter[0];
    if (!inviterRecord) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral code" });
    }

    if (inviterRecord.id === invitee.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot refer yourself" });
    }

    if (existingReferral[0] || invitee.referredByUserId) {
      throw new TRPCError({ code: "CONFLICT", message: "Referral code already applied" });
    }

    const [referral] = await db
      .insert(referrals)
      .values({
        inviterUserId: inviterRecord.id,
        inviteeUserId: invitee.id,
        referralCode: normalizedCode,
        attributionSource: "DIRECT",
        status: "PENDING" as any,
      })
      .returning();

    if (!referral) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to apply referral code" });
    }

    await db
      .update(users)
      .set({ referredByUserId: inviterRecord.id, updatedAt: new Date() })
      .where(eq(users.id, invitee.id));

    const refreshedReferral = await this.refreshReferralQualification(referral.id);

    return {
      success: true,
      referral: refreshedReferral ?? referral,
    };
  }

  async getReferralProgress(userId: string) {
    await this.refreshOutstandingReferralsForUser(userId);
    const user = await this.ensureInviteCode(userId);

    const [totals, rewards, myReferrals] = await Promise.all([
      db
        .select({
          totalInvited: count(referrals.id),
        })
        .from(referrals)
        .where(eq(referrals.inviterUserId, userId)),
      db
        .select()
        .from(referralRewards)
        .where(eq(referralRewards.inviterUserId, userId))
        .orderBy(desc(referralRewards.createdAt))
        .limit(25),
      db
        .select({
          id: referrals.id,
          inviteeUserId: referrals.inviteeUserId,
          status: referrals.status,
          createdAt: referrals.createdAt,
          qualifiedAt: referrals.qualifiedAt,
          inviteeDisplayName: users.displayName,
          inviteeAvatarUrl: users.avatarUrl,
        })
        .from(referrals)
        .innerJoin(users, eq(users.id, referrals.inviteeUserId))
        .where(eq(referrals.inviterUserId, userId))
        .orderBy(desc(referrals.createdAt))
        .limit(25),
    ]);

    const totalInvited = Number(totals[0]?.totalInvited ?? 0);
    const totalQualified = Number(
      myReferrals.filter((referral) => referral.status === "QUALIFIED" || referral.status === "REWARDED").length,
    );
    const totalRewarded = Number(
      myReferrals.filter((referral) => referral.status === "REWARDED").length,
    );

    return {
      inviteCode: user.referralCode,
      referralCode: user.referralCode,
      totalInvited,
      totalReferrals: totalInvited,
      totalQualified,
      completedReferrals: totalRewarded,
      totalRewarded,
      rewards,
      referrals: myReferrals,
    };
  }

  async getReferralOverview(limit = 25) {
    const pending = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(inArray(referrals.status, ["PENDING", "QUALIFIED"] as any))
      .orderBy(desc(referrals.createdAt))
      .limit(Math.max(limit, 25));

    for (const referral of pending) {
      await this.refreshReferralQualification(referral.id);
    }

    const [statusCounts, recentReferrals, recentRewards, openFlags] = await Promise.all([
      db
        .select({ status: referrals.status, total: count(referrals.id) })
        .from(referrals)
        .groupBy(referrals.status),
      db
        .select({
          id: referrals.id,
          referralCode: referrals.referralCode,
          status: referrals.status,
          createdAt: referrals.createdAt,
          qualifiedAt: referrals.qualifiedAt,
          inviterUserId: referrals.inviterUserId,
          inviteeUserId: referrals.inviteeUserId,
          inviterDisplayName: users.displayName,
          inviterAvatarUrl: users.avatarUrl,
        })
        .from(referrals)
        .innerJoin(users, eq(users.id, referrals.inviterUserId))
        .orderBy(desc(referrals.createdAt))
        .limit(limit),
      db
        .select()
        .from(referralRewards)
        .orderBy(desc(referralRewards.createdAt))
        .limit(limit),
      db
        .select({ count: count() })
        .from(fraudFlags)
        .where(and(eq(fraudFlags.entityType, "REFERRAL" as any), eq(fraudFlags.status, "OPEN" as any))),
    ]);

    const counts = statusCounts.reduce<Record<string, number>>((acc, row) => {
      acc[String(row.status)] = Number(row.total ?? 0);
      return acc;
    }, {});

    return {
      summary: {
        total: statusCounts.reduce((sum, row) => sum + Number(row.total ?? 0), 0),
        pending: counts.PENDING ?? 0,
        qualified: counts.QUALIFIED ?? 0,
        rewarded: counts.REWARDED ?? 0,
        rejected: counts.REJECTED ?? 0,
        openFraudFlags: Number(openFlags[0]?.count ?? 0),
      },
      recentReferrals,
      recentRewards,
    };
  }
}
