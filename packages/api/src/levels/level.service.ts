import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  levels,
  userLevels,
  userXpEvents,
  levelRewards,
  loginStreaks,
  badges,
  userBadges,
  modelStats,
  modelLevelRules,
  modelLevelHistory,
  giftTransactions,
  callSessions,
} from "@missu/db/schema";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";
import { ConfigService } from "../config/config.service";

type NormalizedLevel = {
  id: string;
  levelNumber: number;
  levelName: string;
  levelTrack: string;
  thresholdValue: number;
  iconUrl: string | null;
  status?: string | null;
  createdAt?: Date | string | null;
};

type NormalizedUserLevel = {
  id: string;
  userId: string;
  currentLevelId: string;
  currentProgressValue: number;
  levelUpAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type NormalizedLevelReward = {
  id: string;
  levelId: string;
  rewardType: string;
  rewardValue: string;
  rewardName: string | null;
  description: string | null;
  autoGrant: boolean;
  createdAt?: Date | string | null;
};

type NormalizedBadge = {
  badgeId: string;
  badgeKey: string | null;
  awardedAt: Date | string | null;
  name: string;
  description: string | null;
  iconUrl: string | null;
  category: string | null;
};

@Injectable()
export class LevelService {
  private levelSchemaModePromise: Promise<"modern" | "legacy"> | null = null;

  constructor(private readonly configService: ConfigService) {}

  private async getLevelSchemaMode() {
    if (!this.levelSchemaModePromise) {
      this.levelSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'levels'
            and column_name = 'level_track'
        ) as has_modern_levels
      `).then((result) => {
        const value = result.rows[0] as { has_modern_levels?: boolean | string | number } | undefined;
        return value?.has_modern_levels ? "modern" : "legacy";
      });
    }

    return this.levelSchemaModePromise;
  }

  private async ensureLegacyUserLevelsSeeded() {
    const existing = await db.execute(sql`
      select count(*)::int as count
      from levels
      where level_type = 'USER'
    `).then((result) => Number((result.rows[0] as { count?: number } | undefined)?.count ?? 0));

    if (existing > 0) {
      return;
    }

    const seeds = [
      { levelNumber: 1, levelName: "Spark", thresholdValue: 0, iconUrl: "https://missu.local/levels/spark.png" },
      { levelNumber: 2, levelName: "Rising", thresholdValue: 120, iconUrl: "https://missu.local/levels/rising.png" },
      { levelNumber: 3, levelName: "Spotlight", thresholdValue: 280, iconUrl: "https://missu.local/levels/spotlight.png" },
      { levelNumber: 4, levelName: "Pulse", thresholdValue: 600, iconUrl: "https://missu.local/levels/pulse.png" },
      { levelNumber: 5, levelName: "Supernova", thresholdValue: 1200, iconUrl: "https://missu.local/levels/supernova.png" },
      { levelNumber: 6, levelName: "Legend", thresholdValue: 2400, iconUrl: "https://missu.local/levels/legend.png" },
    ];

    for (const seed of seeds) {
      await db.execute(sql`
        insert into levels (id, level_type, level_number, name, threshold_value, icon_url, created_at)
        select gen_random_uuid(), 'USER', ${seed.levelNumber}, ${seed.levelName}, ${seed.thresholdValue}, ${seed.iconUrl}, now()
        where not exists (
          select 1 from levels
          where level_type = 'USER' and level_number = ${seed.levelNumber}
        )
      `);
    }
  }

  private async getOrderedLevels(track: "USER" | "MODEL") {
    if (await this.getLevelSchemaMode() === "legacy") {
      if (track === "USER") {
        await this.ensureLegacyUserLevelsSeeded();
      }

      const result = await db.execute(sql`
        select
          id,
          level_number as "levelNumber",
          name as "levelName",
          level_type as "levelTrack",
          threshold_value as "thresholdValue",
          icon_url as "iconUrl",
          created_at as "createdAt"
        from levels
        where level_type = ${track}
        order by level_number asc
      `);

      return result.rows as NormalizedLevel[];
    }

    return db
      .select()
      .from(levels)
      .where(and(eq(levels.levelTrack, track as any), eq(levels.status, "ACTIVE" as any)))
      .orderBy(asc(levels.levelNumber));
  }

  private async getLevelById(levelId: string) {
    if (await this.getLevelSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          id,
          level_number as "levelNumber",
          name as "levelName",
          level_type as "levelTrack",
          threshold_value as "thresholdValue",
          icon_url as "iconUrl",
          created_at as "createdAt"
        from levels
        where id = ${levelId}::uuid
        limit 1
      `);

      return (result.rows[0] as NormalizedLevel | undefined) ?? null;
    }

    const [level] = await db.select().from(levels).where(eq(levels.id, levelId)).limit(1);
    return (level as NormalizedLevel | undefined) ?? null;
  }

  private async getLevelRewards(levelIds: string[]) {
    if (levelIds.length === 0) {
      return [] as NormalizedLevelReward[];
    }

    if (await this.getLevelSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          id,
          level_id as "levelId",
          reward_type as "rewardType",
          reward_value as "rewardValue",
          null::text as "rewardName",
          null::text as description,
          true as "autoGrant",
          created_at as "createdAt"
        from level_rewards
        where level_id in (${sql.join(levelIds.map((levelId) => sql`${levelId}::uuid`), sql`, `)})
        order by created_at asc
      `);

      return result.rows as NormalizedLevelReward[];
    }

    const rewards = await db
      .select()
      .from(levelRewards)
      .where(and(inArray(levelRewards.levelId, levelIds), eq(levelRewards.status, "ACTIVE" as any)))
      .orderBy(asc(levelRewards.createdAt));

    return rewards as NormalizedLevelReward[];
  }

  private async getFirstActiveUserLevel() {
    const [firstLevel] = await this.getOrderedLevels("USER");
    if (!firstLevel) {
      throw new Error("User level track is not configured");
    }
    return firstLevel;
  }

  private async getUserXpPolicy() {
    const configured = await this.configService.getSetting("levels", "xp_rules");
    const value = (configured?.valueJson as Record<string, unknown> | null) ?? {};

    return {
      watchSecondsPerInterval: Math.max(1, Number(value.watchSecondsPerInterval ?? DEFAULTS.LEVEL_XP.WATCH_SECONDS_PER_INTERVAL)),
      watchXpPerInterval: Math.max(1, Number(value.watchXpPerInterval ?? DEFAULTS.LEVEL_XP.WATCH_XP_PER_INTERVAL)),
      watchMinSeconds: Math.max(1, Number(value.watchMinSeconds ?? DEFAULTS.LEVEL_XP.WATCH_MIN_SECONDS)),
      streamSecondsPerInterval: Math.max(1, Number(value.streamSecondsPerInterval ?? DEFAULTS.LEVEL_XP.STREAM_SECONDS_PER_INTERVAL)),
      streamXpPerInterval: Math.max(1, Number(value.streamXpPerInterval ?? DEFAULTS.LEVEL_XP.STREAM_XP_PER_INTERVAL)),
      streamMinSeconds: Math.max(1, Number(value.streamMinSeconds ?? DEFAULTS.LEVEL_XP.STREAM_MIN_SECONDS)),
      giftCoinsPerInterval: Math.max(1, Number(value.giftCoinsPerInterval ?? DEFAULTS.LEVEL_XP.GIFT_COINS_PER_INTERVAL)),
      giftXpPerInterval: Math.max(1, Number(value.giftXpPerInterval ?? DEFAULTS.LEVEL_XP.GIFT_XP_PER_INTERVAL)),
    };
  }

  private async autoGrantLevelRewards(userId: string, levelId: string) {
    const rewards = (await this.getLevelRewards([levelId])).filter((reward) => reward.autoGrant);
    const schemaMode = await this.getLevelSchemaMode();

    const grantedRewards: any[] = [];
    for (const reward of rewards) {
      if (reward.rewardType === "BADGE") {
        const badge = schemaMode === "legacy"
          ? (await db.execute(sql`
            select id, name, icon_url as "iconUrl", description
            from badges
            where name = ${reward.rewardValue} or criteria = ${reward.rewardValue}
            limit 1
          `).then((result) => result.rows[0] as { id: string } | undefined))
          : (await db.select().from(badges).where(eq(badges.badgeKey, reward.rewardValue)).limit(1))[0];

        if (badge) {
          if (schemaMode === "legacy") {
            await db.execute(sql`
              insert into user_badges (id, user_id, badge_id, awarded_at)
              select gen_random_uuid(), ${userId}::uuid, ${badge.id}::uuid, now()
              where not exists (
                select 1 from user_badges
                where user_id = ${userId}::uuid and badge_id = ${badge.id}::uuid
              )
            `);
          } else {
            await db.insert(userBadges).values({
              userId,
              badgeId: badge.id,
              source: "LEVEL_UP",
            } as any).onConflictDoNothing({ target: [userBadges.userId, userBadges.badgeId] });
          }
        }
      }

      grantedRewards.push(reward);
    }

    return grantedRewards;
  }

  private async ensureUserLevelRecord(userId: string) {
    if (await this.getLevelSchemaMode() === "legacy") {
      const existing = await db.execute(sql`
        select
          id,
          user_id as "userId",
          level_id as "currentLevelId",
          current_value as "currentProgressValue",
          updated_at as "updatedAt"
        from user_levels
        where user_id = ${userId}::uuid
        limit 1
      `);

      const userLevel = existing.rows[0] as NormalizedUserLevel | undefined;
      if (userLevel) {
        return userLevel;
      }

      const firstLevel = await this.getFirstActiveUserLevel();
      const created = await db.execute(sql`
        insert into user_levels (id, user_id, level_id, current_value, updated_at)
        values (gen_random_uuid(), ${userId}::uuid, ${firstLevel.id}::uuid, 0, now())
        returning
          id,
          user_id as "userId",
          level_id as "currentLevelId",
          current_value as "currentProgressValue",
          updated_at as "updatedAt"
      `);

      const row = created.rows[0] as NormalizedUserLevel | undefined;
      if (!row) {
        throw new Error("Failed to create user level");
      }

      await this.autoGrantLevelRewards(userId, firstLevel.id);
      return row;
    }

    const [userLevel] = await db
      .select()
      .from(userLevels)
      .where(and(eq(userLevels.userId, userId), eq(userLevels.levelTrack, "USER" as any)))
      .limit(1);

    if (userLevel) {
      return userLevel;
    }

    const firstLevel = await this.getFirstActiveUserLevel();
    const [created] = await db
      .insert(userLevels)
      .values({
        userId,
        levelTrack: "USER",
        currentLevelId: firstLevel.id,
        currentProgressValue: 0,
      } as any)
      .returning();

    if (!created) {
      throw new Error("Failed to create user level");
    }

    await this.autoGrantLevelRewards(userId, firstLevel.id);
    return created;
  }

  private async awardXp(userId: string, xpAmount: number, sourceType: string, idempotencyKey: string, metadataJson?: Record<string, unknown>) {
    const ensuredLevel = await this.ensureUserLevelRecord(userId);
    if (xpAmount <= 0) {
      return {
        awardedXp: 0,
        duplicated: false,
        leveledUp: false,
        rewards: [],
        summary: await this.getMyLevelSummary(userId),
      };
    }

    const inserted = await db.insert(userXpEvents).values({
      userId,
      sourceType,
      sourceReferenceId: String(metadataJson?.sourceReferenceId ?? metadataJson?.streamId ?? metadataJson?.viewerSessionId ?? metadataJson?.giftTransactionId ?? ""),
      idempotencyKey,
      xpAmount,
      metadataJson,
    } as any).onConflictDoNothing({ target: userXpEvents.idempotencyKey }).returning({ id: userXpEvents.id });

    if (inserted.length === 0) {
      return {
        awardedXp: 0,
        duplicated: true,
        leveledUp: false,
        rewards: [],
        summary: await this.getMyLevelSummary(userId),
      };
    }

    const schemaMode = await this.getLevelSchemaMode();
    const allLevels = await this.getOrderedLevels("USER") as NormalizedLevel[];
    const currentLevelIndex = Math.max(0, allLevels.findIndex((level) => level.id === ensuredLevel.currentLevelId));
    const currentLevel = allLevels[currentLevelIndex] ?? allLevels[0];
    if (!currentLevel) {
      throw new Error("User level track is not configured");
    }

    let nextProgress = (ensuredLevel.currentProgressValue ?? 0) + xpAmount;
    let nextLevelId = currentLevel.id;
    const unlockedLevelIds: string[] = [];

    for (let index = currentLevelIndex + 1; index < allLevels.length; index += 1) {
      const nextLevel = allLevels[index];
      if (!nextLevel) break;
      const threshold = Math.max(0, Number(nextLevel.thresholdValue ?? 0));
      if (nextProgress < threshold) {
        break;
      }
      nextProgress -= threshold;
      nextLevelId = nextLevel.id;
      unlockedLevelIds.push(nextLevel.id);
    }

    if (schemaMode === "legacy") {
      await db.execute(sql`
        update user_levels
        set level_id = ${nextLevelId}::uuid,
            current_value = ${nextProgress},
            updated_at = now()
        where id = ${ensuredLevel.id}::uuid
      `);
    } else {
      await db
        .update(userLevels)
        .set({
          currentLevelId: nextLevelId,
          currentProgressValue: nextProgress,
          levelUpAt: unlockedLevelIds.length > 0
            ? new Date()
            : ensuredLevel.levelUpAt instanceof Date
              ? ensuredLevel.levelUpAt
              : null,
          updatedAt: new Date(),
        })
        .where(eq(userLevels.id, ensuredLevel.id));
    }

    const grantedRewards: any[] = [];
    for (const levelId of unlockedLevelIds) {
      grantedRewards.push(...await this.autoGrantLevelRewards(userId, levelId));
    }

    return {
      awardedXp: xpAmount,
      duplicated: false,
      leveledUp: unlockedLevelIds.length > 0,
      rewards: grantedRewards,
      summary: await this.getMyLevelSummary(userId),
    };
  }

  async getMyLevelSummary(userId: string) {
    const userLevel = await this.ensureUserLevelRecord(userId);
    const currentLevel = await this.getLevelById(userLevel.currentLevelId);
    if (!currentLevel) {
      throw new Error("Current level not found");
    }

    const userTrackLevels = await this.getOrderedLevels("USER") as NormalizedLevel[];
    const unlockedLevels = userTrackLevels.filter((level) => level.levelNumber <= currentLevel.levelNumber);
    const unlockedLevelIds = unlockedLevels.map((level) => level.id);
    const unlockedRewards = await this.getLevelRewards(unlockedLevelIds);

    const badgeRows = await this.getUserBadges(userId);
    const nextLevel = userTrackLevels.find((level) => level.levelNumber > currentLevel.levelNumber) ?? null;
    const formattedRewards = unlockedRewards.map((reward) => ({
      id: reward.id,
      levelId: reward.levelId,
      rewardType: reward.rewardType,
      rewardValue: reward.rewardValue,
      rewardName: reward.rewardName,
      description: reward.description,
      autoGrant: reward.autoGrant,
    }));
    const activeBadgeReward = [...formattedRewards].reverse().find((reward) => reward.rewardType === "BADGE") ?? null;
    const activeBadge = activeBadgeReward
      ? badgeRows.find((badge) => badge.badgeKey === activeBadgeReward.rewardValue) ?? null
      : badgeRows[0] ?? null;

    return {
      levelId: currentLevel.id,
      level: currentLevel.levelNumber,
      levelName: currentLevel.levelName,
      track: currentLevel.levelTrack,
      xp: Number(userLevel.currentProgressValue ?? 0),
      currentXp: Number(userLevel.currentProgressValue ?? 0),
      nextLevel: nextLevel
        ? {
          levelId: nextLevel.id,
          level: nextLevel.levelNumber,
          levelName: nextLevel.levelName,
          requiredXp: Number(nextLevel.thresholdValue ?? 0),
          remainingXp: Math.max(Number(nextLevel.thresholdValue ?? 0) - Number(userLevel.currentProgressValue ?? 0), 0),
          progressPercent: Number(nextLevel.thresholdValue ?? 0) > 0
            ? Math.min(100, Math.round((Number(userLevel.currentProgressValue ?? 0) / Number(nextLevel.thresholdValue ?? 0)) * 100))
            : 100,
        }
        : null,
      activeBadge,
      badges: badgeRows,
      visualEffects: formattedRewards.filter((reward) => reward.rewardType === "VISUAL_EFFECT"),
      rankingBenefits: formattedRewards.filter((reward) => reward.rewardType === "RANKING_BENEFIT"),
      unlockedRewards: formattedRewards,
      levelUpAt: userLevel.levelUpAt instanceof Date
        ? userLevel.levelUpAt.toISOString()
        : userLevel.levelUpAt ?? null,
    };
  }

  async getUserLevel(userId: string) {
    return this.getMyLevelSummary(userId);
  }

  async awardGiftXp(userId: string, coinAmount: number, giftTransactionId: string, metadataJson: Record<string, unknown> = {}) {
    const policy = await this.getUserXpPolicy();
    const xpAmount = Math.floor(Math.max(0, coinAmount) / policy.giftCoinsPerInterval) * policy.giftXpPerInterval;
    return this.awardXp(userId, xpAmount, "GIFT_SENT", `levelxp:gift:${giftTransactionId}`, {
      ...metadataJson,
      giftTransactionId,
      coinAmount,
      sourceReferenceId: giftTransactionId,
    });
  }

  async awardWatchXp(userId: string, watchDurationSeconds: number, viewerSessionId: string, streamId: string) {
    const policy = await this.getUserXpPolicy();
    const eligibleSeconds = watchDurationSeconds >= policy.watchMinSeconds ? watchDurationSeconds : 0;
    const xpAmount = Math.floor(eligibleSeconds / policy.watchSecondsPerInterval) * policy.watchXpPerInterval;
    return this.awardXp(userId, xpAmount, "LIVE_WATCH", `levelxp:watch:${viewerSessionId}`, {
      viewerSessionId,
      streamId,
      watchDurationSeconds,
      sourceReferenceId: viewerSessionId,
    });
  }

  async awardStreamingXp(userId: string, streamDurationSeconds: number, streamId: string) {
    const policy = await this.getUserXpPolicy();
    const eligibleSeconds = streamDurationSeconds >= policy.streamMinSeconds ? streamDurationSeconds : 0;
    const xpAmount = Math.floor(eligibleSeconds / policy.streamSecondsPerInterval) * policy.streamXpPerInterval;
    return this.awardXp(userId, xpAmount, "LIVE_STREAMED", `levelxp:stream:${streamId}`, {
      streamId,
      streamDurationSeconds,
      sourceReferenceId: streamId,
    });
  }

  async getLoginStreak(userId: string) {
    const [streak] = await db.select().from(loginStreaks).where(eq(loginStreaks.userId, userId)).limit(1);

    if (!streak) {
      const [created] = await db.insert(loginStreaks).values({ userId, currentStreakDays: 1, lastLoginDate: new Date().toISOString().split("T")[0]!, regionCode: "GLOBAL" } as any).returning();
      return created;
    }

    return streak;
  }

  async recordDailyLogin(userId: string) {
    let [streak] = await db.select().from(loginStreaks).where(eq(loginStreaks.userId, userId)).limit(1);

    if (!streak) {
      [streak] = await db.insert(loginStreaks).values({ userId, currentStreakDays: 1, lastLoginDate: new Date().toISOString().split("T")[0]!, regionCode: "GLOBAL" } as any).returning();
      await this.awardXp(userId, DEFAULTS.REWARDS.DAILY_LOGIN_XP, "DAILY_LOGIN", `levelxp:daily-login:${userId}:${new Date().toISOString().split("T")[0]}`, {
        sourceReferenceId: new Date().toISOString().split("T")[0],
      });
      return { streak, xpAwarded: DEFAULTS.REWARDS.DAILY_LOGIN_XP };
    }

    const lastLogin = new Date(streak.lastLoginDate as string);
    const now = new Date();
    const diffMs = now.getTime() - lastLogin.getTime();
    const diffDays = Math.floor(diffMs / 86400_000);

    if (diffDays === 0) return { streak, xpAwarded: 0 };

    let newStreak = streak.currentStreakDays ?? 0;
    if (diffDays === 1) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const [updated] = await db
      .update(loginStreaks)
      .set({ currentStreakDays: newStreak, lastLoginDate: now.toISOString().split("T")[0]!, updatedAt: new Date() })
      .where(eq(loginStreaks.id, streak.id))
      .returning();

    const xpAwarded = DEFAULTS.REWARDS.DAILY_LOGIN_XP + (newStreak >= 7 ? DEFAULTS.REWARDS.STREAK_BONUS_XP : 0);
    await this.awardXp(userId, xpAwarded, "DAILY_LOGIN", `levelxp:daily-login:${userId}:${now.toISOString().split("T")[0]}`, {
      currentStreakDays: newStreak,
      sourceReferenceId: now.toISOString().split("T")[0],
    });

    return { streak: updated, xpAwarded };
  }

  // ─── Badges ───
  async getUserBadges(userId: string) {
    if (await this.getLevelSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          ub.badge_id as "badgeId",
          null::text as "badgeKey",
          ub.awarded_at as "awardedAt",
          b.name,
          b.description,
          b.icon_url as "iconUrl",
          null::text as category
        from user_badges ub
        inner join badges b on b.id = ub.badge_id
        where ub.user_id = ${userId}::uuid
        order by ub.awarded_at desc
      `);

      return result.rows as NormalizedBadge[];
    }

    return db
      .select({
        badgeId: userBadges.badgeId,
        badgeKey: badges.badgeKey,
        awardedAt: userBadges.awardedAt,
        name: badges.name,
        description: badges.description,
        iconUrl: badges.iconUrl,
        category: badges.category,
      })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.awardedAt));
  }

  async awardBadge(userId: string, badgeId: string) {
    if (await this.getLevelSchemaMode() === "legacy") {
      const existing = await db.execute(sql`
        select id from user_badges
        where user_id = ${userId}::uuid and badge_id = ${badgeId}::uuid
        limit 1
      `);
      if (existing.rows[0]) return existing.rows[0];

      const created = await db.execute(sql`
        insert into user_badges (id, user_id, badge_id, awarded_at)
        values (gen_random_uuid(), ${userId}::uuid, ${badgeId}::uuid, now())
        returning id, user_id as "userId", badge_id as "badgeId", awarded_at as "awardedAt"
      `);
      return created.rows[0] ?? null;
    }

    const existing = await db.select().from(userBadges).where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId))).limit(1);
    if (existing[0]) return existing[0];

    const [awarded] = await db.insert(userBadges).values({ userId, badgeId, source: "MANUAL" as any }).returning();
    return awarded;
  }

  async listAllBadges() {
    if (await this.getLevelSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select id, null::text as "badgeKey", name, description, icon_url as "iconUrl", null::text as category, created_at as "createdAt"
        from badges
        order by name asc
      `);
      return result.rows;
    }

    return db.select().from(badges).orderBy(asc(badges.category), asc(badges.name));
  }

  async listAllLevels() {
    const allLevels = await this.getOrderedLevels("USER") as NormalizedLevel[];
    const rewards = await this.getLevelRewards(allLevels.map((level) => level.id));

    return allLevels.map((level) => ({
      ...level,
      rewards: rewards
        .filter((reward) => reward.levelId === level.id)
        .map((reward) => ({
          id: reward.id,
          rewardType: reward.rewardType,
          rewardValue: reward.rewardValue,
          rewardName: reward.rewardName,
          description: reward.description,
          autoGrant: reward.autoGrant,
        })),
    }));
  }

  async recalculateModelLevel(modelUserId: string, changeReason: "AUTO_RECALC" | "EVENT_TRIGGERED" | "ADMIN_OVERRIDE" = "AUTO_RECALC") {
    const [stats] = await db.select().from(modelStats).where(eq(modelStats.modelUserId, modelUserId)).limit(1);
    if (!stats) {
      throw new Error("Model stats not found");
    }

    const [giftAgg] = await db
      .select({ totalDiamonds: sql<number>`coalesce(sum(${giftTransactions.diamondCredit}), 0)` })
      .from(giftTransactions)
      .where(eq(giftTransactions.receiverUserId, modelUserId));

    const [callAgg] = await db
      .select({
        totalAudio: sql<number>`coalesce(sum(case when ${callSessions.callType} = 'AUDIO' then ${callSessions.billableMinutes} else 0 end), 0)`,
        totalVideo: sql<number>`coalesce(sum(case when ${callSessions.callType} = 'VIDEO' then ${callSessions.billableMinutes} else 0 end), 0)`,
      })
      .from(callSessions)
      .where(eq(callSessions.modelUserId, modelUserId));

    const totalDiamonds = Number(giftAgg?.totalDiamonds ?? 0);
    const totalAudio = Number(callAgg?.totalAudio ?? 0);
    const totalVideo = Number(callAgg?.totalVideo ?? 0);

    const rules = await db
      .select()
      .from(modelLevelRules)
      .where(eq(modelLevelRules.isActive, true))
      .orderBy(asc(modelLevelRules.levelNumber));

    let resolvedLevel = 1;
    for (const rule of rules) {
      if (
        totalDiamonds >= (rule.diamondsRequired ?? 0) &&
        totalAudio >= (rule.audioMinutesRequired ?? 0) &&
        totalVideo >= (rule.videoMinutesRequired ?? 0)
      ) {
        resolvedLevel = Math.max(resolvedLevel, rule.levelNumber);
      }
    }

    const oldLevel = stats.currentLevel ?? 1;

    const [updated] = await db
      .update(modelStats)
      .set({
        totalDiamonds,
        totalAudioMinutes: totalAudio,
        totalVideoMinutes: totalVideo,
        currentLevel: resolvedLevel,
        levelUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(modelStats.id, stats.id))
      .returning();

    if (oldLevel !== resolvedLevel) {
      await db.insert(modelLevelHistory).values({
        modelUserId,
        oldLevel,
        newLevel: resolvedLevel,
        changeReason: changeReason as any,
        statsSnapshotJson: {
          totalDiamonds,
          totalAudioMinutes: totalAudio,
          totalVideoMinutes: totalVideo,
        },
      });
    }

    return {
      modelUserId,
      oldLevel,
      newLevel: resolvedLevel,
      changed: oldLevel !== resolvedLevel,
      stats: updated,
    };
  }

  async recalculateAllModelLevels(limit = 200) {
    const rows = await db.select({ modelUserId: modelStats.modelUserId }).from(modelStats).limit(limit);
    const results = [] as Array<{ modelUserId: string; changed: boolean; oldLevel: number; newLevel: number }>;

    for (const row of rows) {
      const recalculated = await this.recalculateModelLevel(row.modelUserId, "AUTO_RECALC");
      results.push({
        modelUserId: row.modelUserId,
        changed: recalculated.changed,
        oldLevel: recalculated.oldLevel,
        newLevel: recalculated.newLevel,
      });
    }

    return {
      processed: results.length,
      changed: results.filter((r) => r.changed).length,
      results,
    };
  }

  async getModelLevelDistribution() {
    const dist = await db
      .select({
        level: modelStats.currentLevel,
        count: sql<number>`count(*)`,
      })
      .from(modelStats)
      .groupBy(modelStats.currentLevel)
      .orderBy(asc(modelStats.currentLevel));

    return dist.map((row) => ({ level: row.level, count: Number(row.count ?? 0) }));
  }
}
