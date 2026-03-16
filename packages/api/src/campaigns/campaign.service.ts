import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { db } from "@missu/db";
import {
  campaignParticipants,
  campaignRewards,
  campaigns,
  payments,
  users,
} from "@missu/db/schema";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { decodeCursor, encodeCursor, generateIdempotencyKey } from "@missu/utils";
import { WalletService } from "../wallet/wallet.service";

type CampaignRewardConfig = {
  rewardType: "COINS" | "DIAMONDS" | "BADGE" | "VIP_DAYS" | "GIFT_MULTIPLIER";
  amount?: number;
  badgeCode?: string;
  vipDays?: number;
  multiplier?: number;
  minProgress?: number;
};

@Injectable()
export class CampaignService {
  constructor(private readonly walletService: WalletService) {}

  private asObject(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private parseRewardConfig(value: unknown): CampaignRewardConfig {
    const reward = this.asObject(value);
    const rewardType = String(reward.rewardType ?? reward.type ?? "COINS").toUpperCase();

    return {
      rewardType: ([
        "COINS",
        "DIAMONDS",
        "BADGE",
        "VIP_DAYS",
        "GIFT_MULTIPLIER",
      ].includes(rewardType) ? rewardType : "COINS") as CampaignRewardConfig["rewardType"],
      amount: reward.amount == null ? undefined : Number(reward.amount),
      badgeCode: typeof reward.badgeCode === "string" ? reward.badgeCode : undefined,
      vipDays: reward.vipDays == null ? undefined : Math.max(1, Math.round(Number(reward.vipDays))),
      multiplier: reward.multiplier == null ? undefined : Number(reward.multiplier),
      minProgress: reward.minProgress == null ? undefined : Number(reward.minProgress),
    };
  }

  private parseRewardRules(raw: unknown): CampaignRewardConfig[] {
    if (Array.isArray(raw)) {
      return raw.map((entry) => this.parseRewardConfig(entry));
    }

    if (raw && typeof raw === "object") {
      const object = raw as Record<string, unknown>;
      if (Array.isArray(object.rewards)) {
        return object.rewards.map((entry) => this.parseRewardConfig(entry));
      }
    }

    return [{ rewardType: "COINS", amount: 100, minProgress: 1 }];
  }

  private getProgressScore(progressJson: unknown) {
    const progress = this.asObject(progressJson);
    if (typeof progress.progress === "number") {
      return progress.progress;
    }
    if (typeof progress.progress === "string") {
      return Number(progress.progress);
    }
    if (typeof progress.completedSteps === "number") {
      return progress.completedSteps;
    }
    if (progress.completed === true) {
      return 1;
    }
    return 0;
  }

  private async isUserEligibleForCampaign(userId: string, campaignId: string) {
    const [campaign, user, completedPayments] = await Promise.all([
      db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1),
      db.select().from(users).where(eq(users.id, userId)).limit(1),
      db.select({ count: count() }).from(payments).where(and(eq(payments.userId, userId), eq(payments.status, "COMPLETED" as any))),
    ]);

    const campaignRecord = campaign[0];
    const userRecord = user[0];

    if (!campaignRecord || !userRecord) {
      return false;
    }

    const segment = this.asObject(campaignRecord.segmentRuleJson);
    const allowedCountries = Array.isArray(segment.countries)
      ? segment.countries.filter((value): value is string => typeof value === "string")
      : [];
    const requiredRole = typeof segment.role === "string" ? segment.role.toUpperCase() : null;
    const payerState = typeof segment.payerState === "string" ? segment.payerState.toUpperCase() : null;

    if (allowedCountries.length > 0 && !allowedCountries.includes(userRecord.country)) {
      return false;
    }

    if (requiredRole && userRecord.role !== requiredRole) {
      return false;
    }

    const totalPayments = Number(completedPayments[0]?.count ?? 0);
    if (payerState === "PAYING" && totalPayments === 0) {
      return false;
    }
    if (payerState === "NON_PAYING" && totalPayments > 0) {
      return false;
    }

    return true;
  }

  async getActiveCampaigns() {
    const now = new Date();
    return db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.status, "ACTIVE" as any), lte(campaigns.startAt, now), gte(campaigns.endAt, now)))
      .orderBy(desc(campaigns.createdAt));
  }

  async listCampaigns(status?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const rows = await db
      .select()
      .from(campaigns)
      .where(status ? eq(campaigns.status, status as any) : undefined)
      .orderBy(desc(campaigns.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const enriched = await Promise.all(
      items.map(async (campaign) => {
        const [participantCount, rewardCount] = await Promise.all([
          db.select({ count: count() }).from(campaignParticipants).where(eq(campaignParticipants.campaignId, campaign.id)),
          db.select({ count: count() }).from(campaignRewards).where(eq(campaignRewards.campaignId, campaign.id)),
        ]);

        return {
          ...campaign,
          participantCount: Number(participantCount[0]?.count ?? 0),
          rewardCount: Number(rewardCount[0]?.count ?? 0),
        };
      }),
    );

    return {
      items: enriched,
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async upsertCampaign(
    input: {
      campaignId?: string;
      name: string;
      campaignType: string;
      startAt: Date;
      endAt: Date;
      status?: string;
      segmentRuleJson?: unknown;
      rewardRuleJson?: unknown;
      budgetLimitJson?: unknown;
    },
    adminUserId: string,
  ) {
    if (input.campaignId) {
      const [updated] = await db
        .update(campaigns)
        .set({
          name: input.name,
          campaignType: input.campaignType,
          startAt: input.startAt,
          endAt: input.endAt,
          status: (input.status ?? "DRAFT") as any,
          segmentRuleJson: input.segmentRuleJson as any,
          rewardRuleJson: input.rewardRuleJson as any,
          budgetLimitJson: input.budgetLimitJson as any,
        })
        .where(eq(campaigns.id, input.campaignId))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(campaigns)
      .values({
        name: input.name,
        campaignType: input.campaignType,
        startAt: input.startAt,
        endAt: input.endAt,
        status: (input.status ?? (input.startAt <= new Date() ? "ACTIVE" : "SCHEDULED")) as any,
        segmentRuleJson: input.segmentRuleJson as any,
        rewardRuleJson: input.rewardRuleJson as any,
        budgetLimitJson: input.budgetLimitJson as any,
        createdByAdminId: adminUserId,
      })
      .returning();

    return created;
  }

  async getCampaignDetail(campaignId: string) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
    }

    const [participants, rewards] = await Promise.all([
      db
        .select()
        .from(campaignParticipants)
        .where(eq(campaignParticipants.campaignId, campaignId))
        .orderBy(desc(campaignParticipants.updatedAt)),
      db
        .select()
        .from(campaignRewards)
        .where(eq(campaignRewards.campaignId, campaignId))
        .orderBy(desc(campaignRewards.createdAt))
        .limit(50),
    ]);

    return {
      campaign,
      participants,
      rewards,
      metrics: {
        participantCount: participants.length,
        rewardCount: rewards.length,
      },
    };
  }

  async joinCampaign(userId: string, campaignId: string) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
    }
    if (!["ACTIVE", "SCHEDULED"].includes(String(campaign.status))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign is not active" });
    }

    const eligible = await this.isUserEligibleForCampaign(userId, campaignId);
    if (!eligible) {
      throw new TRPCError({ code: "FORBIDDEN", message: "User does not match this campaign target" });
    }

    const [existing] = await db
      .select()
      .from(campaignParticipants)
      .where(and(eq(campaignParticipants.campaignId, campaignId), eq(campaignParticipants.userId, userId)))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [participant] = await db
      .insert(campaignParticipants)
      .values({
        campaignId,
        userId,
        progressJson: { progress: 0, completed: false },
        enrollmentStatus: "ENROLLED" as any,
      })
      .returning();

    return participant;
  }

  async updateProgress(userId: string, campaignId: string, progressData: Record<string, unknown>) {
    const [participant] = await db
      .select()
      .from(campaignParticipants)
      .where(and(eq(campaignParticipants.campaignId, campaignId), eq(campaignParticipants.userId, userId)))
      .limit(1);

    if (!participant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Not a campaign participant" });
    }

    const currentProgress = this.asObject(participant.progressJson);
    const mergedProgress = { ...currentProgress, ...progressData };
    const completed = Boolean(mergedProgress.completed) || this.getProgressScore(mergedProgress) >= 1;

    const [updated] = await db
      .update(campaignParticipants)
      .set({
        progressJson: mergedProgress,
        enrollmentStatus: completed ? "COMPLETED" as any : participant.enrollmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(campaignParticipants.id, participant.id))
      .returning();

    return { participant: updated };
  }

  async distributeCampaignRewards(campaignId: string, limit = 200) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
    }

    const participants = await db
      .select()
      .from(campaignParticipants)
      .where(eq(campaignParticipants.campaignId, campaignId))
      .orderBy(desc(campaignParticipants.updatedAt))
      .limit(limit);

    const rewardRules = this.parseRewardRules(campaign.rewardRuleJson);
    let grantedCount = 0;

    for (const participant of participants) {
      const progressScore = this.getProgressScore(participant.progressJson);
      const reward = rewardRules.find((rule) => progressScore >= (rule.minProgress ?? 1));
      if (!reward) {
        continue;
      }

      const [existingReward] = await db
        .select()
        .from(campaignRewards)
        .where(and(eq(campaignRewards.campaignId, campaignId), eq(campaignRewards.userId, participant.userId)))
        .limit(1);

      if (existingReward?.status === "GRANTED") {
        continue;
      }

      if (reward.rewardType === "COINS" && (reward.amount ?? 0) > 0) {
        await this.walletService.creditCoins(
          participant.userId,
          Math.round(reward.amount ?? 0),
          "PROMO_BONUS",
          campaignId,
          `Campaign reward for ${campaign.name}`,
          generateIdempotencyKey(participant.userId, "campaign_reward_coins", campaignId),
        );
      }

      if (reward.rewardType === "DIAMONDS" && (reward.amount ?? 0) > 0) {
        await this.walletService.creditDiamonds(
          participant.userId,
          Math.round(reward.amount ?? 0),
          "ADMIN_ADJUSTMENT",
          campaignId,
          `Campaign reward for ${campaign.name}`,
          generateIdempotencyKey(participant.userId, "campaign_reward_diamonds", campaignId),
        );
      }

      if (existingReward) {
        await db
          .update(campaignRewards)
          .set({
            rewardType: reward.rewardType as any,
            rewardValueJson: reward,
            status: "GRANTED" as any,
            grantedAt: new Date(),
          })
          .where(eq(campaignRewards.id, existingReward.id));
      } else {
        await db.insert(campaignRewards).values({
          campaignId,
          participantId: participant.id,
          userId: participant.userId,
          rewardType: reward.rewardType as any,
          rewardValueJson: reward,
          status: "GRANTED" as any,
          grantedAt: new Date(),
        });
      }

      await db
        .update(campaignParticipants)
        .set({ rewardStatus: "GRANTED", updatedAt: new Date() })
        .where(eq(campaignParticipants.id, participant.id));

      grantedCount += 1;
    }

    return {
      campaignId,
      grantedCount,
    };
  }

  async getCampaignAnalytics(campaignId?: string) {
    if (campaignId) {
      const detail = await this.getCampaignDetail(campaignId);
      return {
        summary: detail.metrics,
        campaign: detail.campaign,
        recentParticipants: detail.participants.slice(0, 10),
        recentRewards: detail.rewards.slice(0, 10),
      };
    }

    const [campaignCount, participantCount, rewardCount, activeCount] = await Promise.all([
      db.select({ count: count() }).from(campaigns),
      db.select({ count: count() }).from(campaignParticipants),
      db.select({ count: count() }).from(campaignRewards),
      db.select({ count: count() }).from(campaigns).where(eq(campaigns.status, "ACTIVE" as any)),
    ]);

    return {
      summary: {
        totalCampaigns: Number(campaignCount[0]?.count ?? 0),
        activeCampaigns: Number(activeCount[0]?.count ?? 0),
        participants: Number(participantCount[0]?.count ?? 0),
        rewards: Number(rewardCount[0]?.count ?? 0),
      },
    };
  }
}
