import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  models, modelApplications, modelAvailability,
  modelDemoVideos, modelLevelRules, modelStats, modelLevelHistory, modelReviews,
} from "@missu/db/schema";
import { eq, and, desc, count, ne } from "drizzle-orm";

type AvailabilityRow = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
};

const DAY_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function timeToMinutes(input: string) {
  const [hours = "0", minutes = "0"] = input.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function getZonedClock(timezone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return {
    dayOfWeek: weekday.slice(0, 3).toUpperCase(),
    minutes: Number(hour) * 60 + Number(minute),
  };
}

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

  private buildAvailabilitySummary(schedule: AvailabilityRow[], isOnlineOverride: boolean) {
    const activeSchedule = schedule.filter((row) => row.isActive);

    if (isOnlineOverride) {
      return {
        schedule: activeSchedule,
        isOnlineOverride,
        isWithinSchedule: true,
        availabilityStatus: "AVAILABLE_NOW" as const,
        nextSlot: null,
      };
    }

    let isWithinSchedule = false;
    let bestNextSlot: AvailabilityRow | null = null;
    let bestDelta = Number.POSITIVE_INFINITY;

    for (const slot of activeSchedule) {
      const clock = getZonedClock(slot.timezone);
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      const slotDayIndex = DAY_ORDER.indexOf(slot.dayOfWeek as (typeof DAY_ORDER)[number]);
      const currentDayIndex = DAY_ORDER.indexOf(clock.dayOfWeek as (typeof DAY_ORDER)[number]);

      if (slotDayIndex === currentDayIndex && clock.minutes >= slotStart && clock.minutes < slotEnd) {
        isWithinSchedule = true;
      }

      let deltaDays = slotDayIndex - currentDayIndex;
      if (deltaDays < 0 || (deltaDays === 0 && slotStart <= clock.minutes)) {
        deltaDays += 7;
      }
      const deltaMinutes = deltaDays * 1440 + (slotStart - clock.minutes);
      if (deltaMinutes < bestDelta) {
        bestDelta = deltaMinutes;
        bestNextSlot = slot;
      }
    }

    return {
      schedule: activeSchedule,
      isOnlineOverride,
      isWithinSchedule,
      availabilityStatus: isWithinSchedule ? "AVAILABLE_NOW" as const : bestNextSlot ? "AVAILABLE_LATER" as const : "OFFLINE" as const,
      nextSlot: bestNextSlot ? {
        dayOfWeek: bestNextSlot.dayOfWeek,
        startTime: bestNextSlot.startTime,
        endTime: bestNextSlot.endTime,
        timezone: bestNextSlot.timezone,
      } : null,
    };
  }

  async getAvailabilitySummary(modelUserId: string) {
    const [model] = await db.select().from(models).where(eq(models.userId, modelUserId)).limit(1);
    const schedule = await db.select().from(modelAvailability).where(eq(modelAvailability.modelUserId, modelUserId));
    return this.buildAvailabilitySummary(schedule as AvailabilityRow[], Boolean(model?.isOnline));
  }

  async getAvailability(userId: string) {
    return this.getAvailabilitySummary(userId);
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
    return this.getAvailabilitySummary(userId);
  }

  private async syncDemoVideoCount(modelUserId: string) {
    const [totals] = await db
      .select({ count: count() })
      .from(modelDemoVideos)
      .where(and(eq(modelDemoVideos.modelUserId, modelUserId), ne(modelDemoVideos.status, "ARCHIVED" as any)));

    await db
      .update(models)
      .set({ demoVideoCount: Number(totals?.count ?? 0), updatedAt: new Date() })
      .where(eq(models.userId, modelUserId));
  }

  async getDemoVideos(modelUserId: string, status?: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED") {
    return db
      .select()
      .from(modelDemoVideos)
      .where(
        and(
          eq(modelDemoVideos.modelUserId, modelUserId),
          status ? eq(modelDemoVideos.status, status as any) : undefined,
        ),
      )
      .orderBy(modelDemoVideos.displayOrder, desc(modelDemoVideos.createdAt));
  }

  async createDemoVideo(modelUserId: string, input: {
    videoUrl: string;
    thumbnailUrl: string;
    title?: string;
    durationSeconds: number;
    displayOrder?: number;
  }) {
    const [video] = await db
      .insert(modelDemoVideos)
      .values({
        modelUserId,
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl,
        title: input.title,
        durationSeconds: input.durationSeconds,
        displayOrder: input.displayOrder ?? 0,
        status: "PENDING_REVIEW" as any,
      })
      .returning();

    await this.syncDemoVideoCount(modelUserId);
    return video;
  }

  async getMyStats(modelUserId: string) {
    const [stats] = await db
      .select()
      .from(modelStats)
      .where(eq(modelStats.modelUserId, modelUserId))
      .limit(1);

    const [model] = await db
      .select()
      .from(models)
      .where(eq(models.userId, modelUserId))
      .limit(1);

    return {
      currentLevel: stats?.currentLevel ?? 1,
      totalDiamonds: stats?.totalDiamonds ?? 0,
      totalVideoMinutes: stats?.totalVideoMinutes ?? 0,
      totalAudioMinutes: stats?.totalAudioMinutes ?? 0,
      totalCallsCompleted: stats?.totalCallsCompleted ?? 0,
      totalGiftsReceived: stats?.totalGiftsReceived ?? 0,
      audioPrice: model?.callRateAudioCoins ?? 0,
      videoPrice: model?.callRateVideoCoins ?? 0,
      demoVideoCount: model?.demoVideoCount ?? 0,
      isOnline: Boolean(model?.isOnline),
      updatedAt: stats?.updatedAt ?? model?.updatedAt ?? null,
    };
  }

  async reviewDemoVideo(
    demoVideoId: string,
    status: "APPROVED" | "REJECTED" | "ARCHIVED",
    adminId: string,
    rejectionReason?: string,
  ) {
    const [existing] = await db.select().from(modelDemoVideos).where(eq(modelDemoVideos.id, demoVideoId)).limit(1);
    if (!existing) {
      throw new Error("Demo video not found");
    }

    const [updated] = await db
      .update(modelDemoVideos)
      .set({
        status: status as any,
        reviewedByAdminId: adminId,
        rejectionReason: status === "REJECTED" ? rejectionReason ?? "Rejected by admin review" : null,
        updatedAt: new Date(),
      })
      .where(eq(modelDemoVideos.id, demoVideoId))
      .returning();

    await this.syncDemoVideoCount(existing.modelUserId);
    return updated;
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
