import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  models, modelApplications, modelAvailability,
  modelDemoVideos, modelLevelRules, modelStats, modelLevelHistory, modelReviews, profiles,
} from "@missu/db/schema";
import { eq, and, desc, count, ne, sql } from "drizzle-orm";

type AvailabilityRow = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
};

const DAY_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function normalizeLegacyDayOfWeek(value: unknown) {
  if (typeof value === "string" && DAY_ORDER.includes(value as (typeof DAY_ORDER)[number])) {
    return value as AvailabilityRow["dayOfWeek"];
  }

  const dayNumber = Number(value);
  if (Number.isInteger(dayNumber)) {
    if (dayNumber >= 0 && dayNumber <= 6) {
      return DAY_ORDER[dayNumber] ?? "SUN";
    }
    if (dayNumber >= 1 && dayNumber <= 7) {
      return DAY_ORDER[dayNumber % 7] ?? "SUN";
    }
  }

  return "SUN";
}

function normalizeLegacyAvailabilityRow(row: Record<string, unknown>): AvailabilityRow {
  return {
    dayOfWeek: normalizeLegacyDayOfWeek(row.dayOfWeek),
    startTime: String(row.startTime ?? "00:00"),
    endTime: String(row.endTime ?? "00:00"),
    timezone: String(row.timezone ?? "UTC"),
    isActive: Boolean(row.isActive ?? true),
  };
}

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
  private modelSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private modelStatsSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private modelDemoSchemaModePromise: Promise<"modern" | "legacy"> | null = null;

  private async getModelSchemaMode() {
    if (!this.modelSchemaModePromise) {
      this.modelSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'models'
        ) as has_models
      `).then((result) => {
        const value = result.rows[0] as { has_models?: boolean | string | number } | undefined;
        return value?.has_models ? "modern" : "legacy";
      });
    }

    return this.modelSchemaModePromise;
  }

  private async getModelStatsSchemaMode() {
    if (!this.modelStatsSchemaModePromise) {
      this.modelStatsSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'model_stats'
        ) as has_model_stats
      `).then((result) => {
        const value = result.rows[0] as { has_model_stats?: boolean | string | number } | undefined;
        return value?.has_model_stats ? "modern" : "legacy";
      });
    }

    return this.modelStatsSchemaModePromise;
  }

  private async getModelDemoSchemaMode() {
    if (!this.modelDemoSchemaModePromise) {
      this.modelDemoSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'model_demo_videos'
            and column_name = 'status'
        ) as has_status
      `).then((result) => {
        const value = result.rows[0] as { has_status?: boolean | string | number } | undefined;
        return value?.has_status ? "modern" : "legacy";
      });
    }

    return this.modelDemoSchemaModePromise;
  }

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
    if (await this.getModelSchemaMode() === "legacy") {
      const scheduleResult = await db.execute(sql`
        select
          day_of_week as "dayOfWeek",
          start_time as "startTime",
          end_time as "endTime",
          timezone,
          true as "isActive"
        from model_availability
        where user_id = ${modelUserId}::uuid
        order by created_at asc
      `);
      return this.buildAvailabilitySummary(
        (scheduleResult.rows as Array<Record<string, unknown>>).map((row) => normalizeLegacyAvailabilityRow(row)),
        false,
      );
    }

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
    if (await this.getModelSchemaMode() === "legacy") {
      await db.execute(sql`delete from model_availability where user_id = ${userId}::uuid`);
      for (const slot of schedule) {
        const dayOfWeek = DAY_ORDER.indexOf((slot.day ?? "").toUpperCase() as (typeof DAY_ORDER)[number]);
        await db.execute(sql`
          insert into model_availability (user_id, day_of_week, start_time, end_time, timezone)
          values (
            ${userId}::uuid,
            ${dayOfWeek >= 0 ? dayOfWeek : 0},
            ${slot.startTime},
            ${slot.endTime},
            ${slot.timezone}
          )
        `);
      }
      return { success: true };
    }

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
    if (await this.getModelSchemaMode() === "legacy") {
      const summary = await this.getAvailabilitySummary(userId);
      return {
        ...summary,
        isOnlineOverride: isOnline,
        availabilityStatus: isOnline ? "AVAILABLE_NOW" : summary.availabilityStatus,
      };
    }

    await db.update(models).set({
      isOnline,
      lastOnlineAt: isOnline ? new Date() : undefined,
      updatedAt: new Date(),
    }).where(eq(models.userId, userId));
    return this.getAvailabilitySummary(userId);
  }

  private async syncDemoVideoCount(modelUserId: string) {
    if (await this.getModelSchemaMode() === "legacy") {
      return;
    }

    if (await this.getModelDemoSchemaMode() === "legacy") {
      return;
    }

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
    if (await this.getModelDemoSchemaMode() === "legacy") {
      if (status && status !== "APPROVED" && status !== "ARCHIVED") {
        return [];
      }

      const results = await db.execute(sql`
        select
          id,
          user_id as "modelUserId",
          video_url as "videoUrl",
          thumbnail_url as "thumbnailUrl",
          duration_seconds as "durationSeconds",
          case when is_active then 'APPROVED' else 'ARCHIVED' end as status,
          0 as "displayOrder",
          null::text as title,
          created_at as "createdAt",
          created_at as "updatedAt"
        from model_demo_videos
        where user_id = ${modelUserId}::uuid
          ${status === "APPROVED" ? sql`and is_active = true` : sql``}
          ${status === "ARCHIVED" ? sql`and is_active = false` : sql``}
        order by created_at desc
      `);

      return results.rows;
    }

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
    if (await this.getModelDemoSchemaMode() === "legacy") {
      const results = await db.execute(sql`
        insert into model_demo_videos (user_id, video_url, thumbnail_url, duration_seconds, is_active)
        values (
          ${modelUserId}::uuid,
          ${input.videoUrl},
          ${input.thumbnailUrl},
          ${input.durationSeconds},
          false
        )
        returning
          id,
          user_id as "modelUserId",
          video_url as "videoUrl",
          thumbnail_url as "thumbnailUrl",
          duration_seconds as "durationSeconds",
          'ARCHIVED'::text as status,
          0 as "displayOrder",
          null::text as title,
          created_at as "createdAt",
          created_at as "updatedAt"
      `);

      return results.rows[0] ?? null;
    }

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
    if ((await this.getModelSchemaMode()) === "legacy" || (await this.getModelStatsSchemaMode()) === "legacy") {
      const [callStatsResult, profileResult, demoVideos] = await Promise.all([
        db.execute(sql`select * from model_call_stats where model_user_id = ${modelUserId}::uuid limit 1`),
        db.execute(sql`select level, updated_at as "updatedAt" from profiles where user_id = ${modelUserId}::uuid limit 1`),
        db.execute(sql`
          select count(*)::int as count
          from model_demo_videos
          where user_id = ${modelUserId}::uuid
            and is_active = true
        `),
      ]);

      const stats = callStatsResult.rows[0] as Record<string, unknown> | undefined;
      const profile = profileResult.rows[0] as { level?: number | string; updatedAt?: Date | string | null } | undefined;
      const demoCount = Number((demoVideos.rows[0] as { count?: number | string } | undefined)?.count ?? 0);

      return {
        currentLevel: Number(profile?.level ?? 1),
        totalDiamonds: 0,
        totalVideoMinutes: Number(stats?.videoMinutesTotal ?? stats?.video_minutes_total ?? 0),
        totalAudioMinutes: Number(stats?.audioMinutesTotal ?? stats?.audio_minutes_total ?? 0),
        totalCallsCompleted: 0,
        totalGiftsReceived: 0,
        audioPrice: 0,
        videoPrice: 0,
        demoVideoCount: demoCount,
        isOnline: false,
        updatedAt: (stats?.updatedAt as Date | string | null | undefined) ?? profile?.updatedAt ?? null,
      };
    }

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
    if (await this.getModelDemoSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        update model_demo_videos
        set is_active = ${status === "APPROVED"}
        where id = ${demoVideoId}::uuid
        returning
          id,
          user_id as "modelUserId",
          video_url as "videoUrl",
          thumbnail_url as "thumbnailUrl",
          duration_seconds as "durationSeconds",
          case when is_active then 'APPROVED' else 'ARCHIVED' end as status,
          0 as "displayOrder",
          null::text as title,
          created_at as "createdAt",
          created_at as "updatedAt"
      `);
      const updated = result.rows[0];
      if (!updated) {
        throw new Error("Demo video not found");
      }
      return updated;
    }

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
    if (await this.getModelStatsSchemaMode() === "legacy") {
      const result = await db.execute(sql`select level from profiles where user_id = ${userId}::uuid limit 1`);
      const profile = result.rows[0] as { level?: number | string } | undefined;
      return { level: Number(profile?.level ?? 0), stats: null };
    }

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
