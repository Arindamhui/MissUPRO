import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  models, modelApplications, modelAvailability,
  modelLevelRules, modelStats, modelLevelHistory, modelReviews,
} from "@missu/db/schema";
import { eq, and, desc } from "drizzle-orm";

@Injectable()
export class ModelService {
  async submitApplication(userId: string, data: {
    legalName: string; displayName: string; talentDescription: string;
    talentCategories: string[]; languages: string[];
    country: string; city: string; dob: Date; introVideoUrl: string;
    scheduleJson?: any; idDocFrontUrl: string; idDocBackUrl: string;
  }) {
    const [app] = await db.insert(modelApplications).values({
      userId,
      legalName: data.legalName,
      displayName: data.displayName,
      talentDescription: data.talentDescription,
      talentCategoriesJson: data.talentCategories,
      languagesJson: data.languages,
      country: data.country,
      city: data.city,
      dob: data.dob.toISOString().split("T")[0]!,
      introVideoUrl: data.introVideoUrl,
      scheduleJson: data.scheduleJson ?? {},
      idDocFrontUrl: data.idDocFrontUrl,
      idDocBackUrl: data.idDocBackUrl,
    } as any).returning();
    return app!;
  }

  async getApplicationStatus(userId: string) {
    const [app] = await db.select().from(modelApplications)
      .where(eq(modelApplications.userId, userId))
      .orderBy(desc(modelApplications.submittedAt)).limit(1);
    return app ?? null;
  }

  async getAvailability(userId: string) {
    return db.select().from(modelAvailability)
      .where(eq(modelAvailability.modelUserId, userId));
  }

  async updateAvailability(userId: string, schedule: Array<{
    day: string; startTime: string; endTime: string; timezone: string;
  }>) {
    await db.delete(modelAvailability).where(eq(modelAvailability.modelUserId, userId));
    if (schedule.length > 0) {
      await db.insert(modelAvailability).values(
        schedule.map((s) => ({
          modelUserId: userId,
          dayOfWeek: s.day as any,
          startTime: s.startTime,
          endTime: s.endTime,
          timezone: s.timezone,
        })),
      );
    }
    return { success: true };
  }

  async setOnlineOverride(userId: string, isOnline: boolean) {
    await db.update(models).set({
      isOnline,
      lastOnlineAt: isOnline ? new Date() : undefined,
      updatedAt: new Date(),
    }).where(eq(models.userId, userId));
    return { success: true };
  }

  async getModelLevel(userId: string) {
    const [stats] = await db.select().from(modelStats)
      .where(eq(modelStats.modelUserId, userId)).limit(1);
    if (!stats) return { level: 0, stats: null };

    const levelRules = await db.select().from(modelLevelRules)
      .where(eq(modelLevelRules.isActive, true));

    // Find the highest level the model qualifies for
    let level = 0;
    for (const rule of levelRules) {
      if (
        stats.totalDiamonds >= rule.diamondsRequired &&
        stats.totalVideoMinutes >= rule.videoMinutesRequired &&
        stats.totalAudioMinutes >= rule.audioMinutesRequired
      ) {
        level = Math.max(level, rule.levelNumber);
      }
    }

    return { level, stats };
  }

  async getLevelHistory(userId: string) {
    return db.select().from(modelLevelHistory)
      .where(eq(modelLevelHistory.modelUserId, userId))
      .orderBy(desc(modelLevelHistory.createdAt));
  }

  async getMyReviews(userId: string) {
    return db.select().from(modelReviews)
      .where(and(eq(modelReviews.modelUserId, userId), eq(modelReviews.isVisible, true)))
      .orderBy(desc(modelReviews.createdAt));
  }
}
