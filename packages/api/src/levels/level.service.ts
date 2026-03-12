import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { levels, userLevels, levelRewards, loginStreaks, badges, userBadges } from "@missu/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";

@Injectable()
export class LevelService {
  async getUserLevel(userId: string) {
    const [userLevel] = await db
      .select()
      .from(userLevels)
      .where(eq(userLevels.userId, userId))
      .limit(1);

    if (!userLevel) {
      const firstLevel = await db.select().from(levels).orderBy(asc(levels.levelNumber)).limit(1);
      const [created] = await db
        .insert(userLevels)
        .values({ userId, levelTrack: "USER" as any, currentLevelId: firstLevel[0]?.id ?? null, currentProgressValue: 0 } as any)
        .returning();
      return created;
    }

    return userLevel;
  }

  async addXp(userId: string, xpAmount: number, source: string) {
    let [userLevel] = await db.select().from(userLevels).where(eq(userLevels.userId, userId)).limit(1);

    if (!userLevel) {
      const firstLevel = await db.select().from(levels).orderBy(asc(levels.levelNumber)).limit(1);
      [userLevel] = await db.insert(userLevels).values({ userId, levelTrack: "USER" as any, currentLevelId: firstLevel[0]?.id ?? null, currentProgressValue: 0 } as any).returning();
    }

    if (!userLevel) throw new Error("Failed to create user level");

    const newProgress = (userLevel.currentProgressValue ?? 0) + xpAmount;

    // Check for level up
    const allLevels = await db.select().from(levels).where(eq(levels.levelTrack, userLevel.levelTrack as any)).orderBy(asc(levels.levelNumber));
    const currentLevelIdx = allLevels.findIndex((l) => l.id === userLevel.currentLevelId);
    let newLevelId = userLevel.currentLevelId;
    let remainingProgress = newProgress;
    let leveledUp = false;

    for (let i = currentLevelIdx + 1; i < allLevels.length; i++) {
      if (remainingProgress >= (allLevels[i].thresholdValue ?? 0)) {
        newLevelId = allLevels[i].id;
        remainingProgress -= allLevels[i].thresholdValue ?? 0;
        leveledUp = true;
      } else {
        break;
      }
    }

    const [updated] = await db
      .update(userLevels)
      .set({ currentLevelId: newLevelId, currentProgressValue: remainingProgress, levelUpAt: leveledUp ? new Date() : userLevel.levelUpAt, updatedAt: new Date() })
      .where(eq(userLevels.id, userLevel.id))
      .returning();

    let rewards: any[] = [];
    if (leveledUp && newLevelId) {
      rewards = await db.select().from(levelRewards).where(eq(levelRewards.levelId, newLevelId));
    }

    return { userLevel: updated, leveledUp, rewards };
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
    await this.addXp(userId, xpAwarded, "daily_login");

    return { streak: updated, xpAwarded };
  }

  // ─── Badges ───
  async getUserBadges(userId: string) {
    return db
      .select({
        badgeId: userBadges.badgeId,
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
    const existing = await db.select().from(userBadges).where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId))).limit(1);
    if (existing[0]) return existing[0];

    const [awarded] = await db.insert(userBadges).values({ userId, badgeId, source: "MANUAL" as any }).returning();
    return awarded;
  }

  async listAllBadges() {
    return db.select().from(badges).orderBy(asc(badges.category), asc(badges.name));
  }

  async listAllLevels() {
    const allLevels = await db.select().from(levels).orderBy(asc(levels.levelNumber));
    return allLevels;
  }
}
